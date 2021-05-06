import { Route53 } from "aws-sdk";

const route53 = new Route53();

const buildResourceRecordSet = (domain, values) => ({
  Name: `_acme-challenge.${domain}`,
  Type: "TXT",
  ResourceRecords: values.map((challengeTxt) => ({
    Value: JSON.stringify(challengeTxt),
  })),
  TTL: 1,
});

export const saveAcmeTxtRecords = (hostedZoneId, domain, values) => {
  const toSend = {
    ChangeBatch: {
      Changes: [
        {
          Action: "UPSERT",
          ResourceRecordSet: buildResourceRecordSet(domain, values),
        },
      ],
      Comment:
        "This value is a computed digest of the token received from the ACME challenge.",
    },
    HostedZoneId: hostedZoneId,
  };

  return route53.changeResourceRecordSets(toSend).promise();
};

export const removeAcmeTxtRecords = (hostedZoneId, domain, values) => {
  const toSend = {
    ChangeBatch: {
      Changes: [
        {
          Action: "DELETE",
          ResourceRecordSet: buildResourceRecordSet(domain, values),
        },
      ],
      Comment: "Removing ACME challenges.",
    },
    HostedZoneId: hostedZoneId,
  };

  return route53.changeResourceRecordSets(toSend).promise();
};
