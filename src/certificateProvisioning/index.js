import forge from "node-forge";
import { getClient } from "./client";
import processOrders from "./order";
import { getS3CertificateData } from "../aws/s3";
import { asyncFilter } from "../util/array";
import config from "../config.json";
import { PRODUCTION } from "../util/env";

const certificateConfigList = config.certificateConfigList;

const diffDays = (date1, date2) =>
  (date1.getTime() - date2.getTime()) / (24 * 60 * 60 * 1000);

const daysUntilCertExpires = (cert) => {
  const certificateObj = forge.pki.certificateFromPem(cert);
  const certificateExpiry = new Date(certificateObj.validity.notAfter);
  const now = new Date();

  return diffDays(certificateExpiry, now);
};

const isCertificateRenewalNeeded = async (certificateConfig) => {
  const certName = certificateConfig.name;
  const certData = await getS3CertificateData(certName)
    .then((data) => JSON.parse(data.Body.toString()))
    .catch(() => null);

  if (!certData) {
    return true;
  }

  const days = daysUntilCertExpires(certData.cert);
  const roundedDays = Math.round(days * 100) / 100;

  if (days <= 0) {
    console.log(`Cert ${certName} has expired, renewing`);
    return true;
  }

  if (days <= 30) {
    console.log(`Cert ${certName} has ${roundedDays} days left, renewing`);
    return true;
  }

  console.log(`Cert ${certName} has ${roundedDays} days left, ignoring`);
  return false;
};

export default async () => {
  console.log(`Running. Is prod: ${PRODUCTION ? "yes" : "no"}`);

  const certOrdersToRenew = await asyncFilter(
    certificateConfigList,
    isCertificateRenewalNeeded
  );

  if (certOrdersToRenew.length > 0) {
    const client = await getClient();
    await processOrders(client, certOrdersToRenew);
  }

  console.log("Done!");
};
