import acme from "acme-client";
import {
  getS3AccountKey,
  getS3AccountUrl,
  putS3AccountKey,
  putS3AccountUrl,
} from "../aws/s3";
import config from "../config.json";
import { PRODUCTION } from "../util/env";

const letsEncryptEmail = config.letsEncryptEmail;

const acmeDirectoryUrl = PRODUCTION
  ? acme.directory.letsencrypt.production
  : acme.directory.letsencrypt.staging;

const buildAndSaveAccountKey = async () => {
  console.log("Building and saving new account key");
  const accountKey = await acme.forge.createPrivateKey();

  await putS3AccountKey(accountKey);

  return accountKey;
};

const getAccountUrl = () =>
  getS3AccountUrl()
    .then((data) => data.Body.toString())
    .catch(() => null);

const saveAccountUrl = async (client) => {
  const accountUrl = await client.getAccountUrl();

  await putS3AccountUrl(accountUrl);
};

const getAccountKey = () =>
  getS3AccountKey()
    .then((data) => data.Body)
    .catch(async (e) => {
      if (!e.code || e.code !== "NoSuchKey") {
        throw e;
      }

      return buildAndSaveAccountKey();
    });

export const getClient = async () => {
  const accountKey = await getAccountKey();
  const accountUrl = await getAccountUrl();

  console.log("Registered?", !!accountUrl);

  const client = new acme.Client({
    accountKey,
    accountUrl,
    directoryUrl: acmeDirectoryUrl,
    backoffAttempts: 7,
    backoffMin: 10000,
    backoffMax: 10000,
  });

  if (!accountUrl) {
    await client.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${letsEncryptEmail}`],
    });

    await saveAccountUrl(client);
  }

  return client;
};
