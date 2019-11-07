import acme from "acme-client";
import { removeAcmeTxtRecords, saveAcmeTxtRecords } from "../aws/route53";
import { putS3CertificateData } from "../aws/s3";
import { zip } from "../util/array";

const createDnsChallenge = async (hostedZoneId, domain, keyAuthorizations) => {
  console.log(
    `Setting [${keyAuthorizations.join(
      ", "
    )}] as txt record on _acme-challenge.${domain}`
  );

  return saveAcmeTxtRecords(hostedZoneId, domain, keyAuthorizations).catch(
    e => {
      console.error(`Couldn't write TXT record _acme-challenge.${domain}`, e);
      throw e;
    }
  );
};

/**
 * Catch errors thrown by removeAcmeTxtRecords() so the order can
 * be finalized, even though something went wrong during cleanup
 */
const cleanupDnsChallenge = (hostedZoneId, domain, keyAuthorizations) =>
  removeAcmeTxtRecords(hostedZoneId, domain, keyAuthorizations).catch(e =>
    console.error(e)
  );

const buildOrderDetailData = dnsNames => ({
  identifiers: dnsNames.map(dnsName => ({
    type: "dns",
    value: dnsName
  }))
});

const performAndValidateDomainChallenge = async (
  client,
  hostedZoneId,
  domain,
  auths
) => {
  console.log("Domain: ", domain);
  const challenges = auths.map(auth =>
    auth.challenges.find(challenge => challenge.type === "dns-01")
  );

  const keyAuthorizations = await Promise.all(
    challenges.map(challenge => client.getChallengeKeyAuthorization(challenge))
  );

  await createDnsChallenge(hostedZoneId, domain, keyAuthorizations);

  // Give time for DNS to propagate
  await new Promise(resolve => setTimeout(resolve, 10000));

  await Promise.all(
    zip(auths, challenges).map(([auth, challenge]) =>
      Promise.resolve(
        console.log(`Verifying challenge - ${domain} - ${challenge.url}`)
      )
        /* Verify that challenge is satisfied */
        .then(() => client.verifyChallenge(auth, challenge))
        .then(() =>
          console.log(`Completing challenge - ${domain} - ${challenge.url}`)
        )
        /* Notify ACME provider that challenge is satisfied */
        .then(() => client.completeChallenge(challenge))
        .then(() =>
          console.log(
            `Waiting for valid status for challenge - ${domain} - ${challenge.url}`
          )
        )
        /* Wait for ACME provider to respond with valid status */
        .then(() => client.waitForValidStatus(challenge))
        .then(() =>
          console.log(`Completed challenge - ${domain} - ${challenge.url}`)
        )
    )
  );

  await cleanupDnsChallenge(hostedZoneId, domain, keyAuthorizations);
};

export const createAndFulfillOrder = async (client, certificateConfig) => {
  console.log("Fulfilling order:", JSON.stringify(certificateConfig));
  const { hostedZoneId, dnsNames } = certificateConfig;
  const order = await client.createOrder(buildOrderDetailData(dnsNames));

  const authorizations = await client.getAuthorizations(order);
  const keyedAuths = authorizations.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.identifier.value]: [...(acc[curr.identifier.value] || []), curr]
    }),
    {}
  );

  const challengePromises = Object.entries(keyedAuths).map(([domain, auths]) =>
    performAndValidateDomainChallenge(client, hostedZoneId, domain, auths)
  );

  /* Wait for challenges to complete */
  await Promise.all(challengePromises);

  /* Finalize order */
  const [key, csr] = await acme.forge.createCsr({
    commonName: dnsNames[0],
    altNames: dnsNames.slice(1)
  });

  console.log("Finalising order and getting cert");
  await client.finalizeOrder(order, csr);
  const cert = await client.getCertificate(order);

  return {
    csr: csr.toString(),
    key: key.toString(),
    cert: cert.toString()
  };
};

export default (client, certificateConfigList) =>
  Promise.all(
    certificateConfigList.map(async certificateConfig => {
      const certName = certificateConfig.name;
      const updatedCertData = await createAndFulfillOrder(
        client,
        certificateConfig
      );
      await putS3CertificateData(certName, updatedCertData);
    })
  );
