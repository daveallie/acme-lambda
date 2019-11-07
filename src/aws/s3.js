import { S3 } from "aws-sdk";
import { PRODUCTION } from "../util/env";

const s3 = new S3();
const bucketName = process.env.BUCKET_NAME;
const folderPostfix = PRODUCTION ? "-prod" : "-dev";

const configFolder = `config${folderPostfix}`;
const certsFolder = `certs${folderPostfix}`;

const accountKeyPath = `${configFolder}/account-key`;
const accountUrlPath = `${configFolder}/account-url`;
const certPath = certName => `${certsFolder}/${certName}.json`;

const getObject = (key, opts = {}) =>
  s3.getObject({ ...opts, Bucket: bucketName, Key: key }).promise();
const putObject = (key, body, opts = {}) =>
  s3.putObject({ ...opts, Body: body, Bucket: bucketName, Key: key }).promise();

export const getS3AccountKey = (opts = {}) => getObject(accountKeyPath, opts);
export const putS3AccountKey = (body, opts = {}) =>
  putObject(accountKeyPath, body, opts);

export const getS3AccountUrl = (opts = {}) => getObject(accountUrlPath, opts);
export const putS3AccountUrl = (body, opts = {}) =>
  putObject(accountUrlPath, body, opts);

export const getS3CertificateData = (certName, opts = {}) =>
  getObject(certPath(certName), opts);
export const putS3CertificateData = (certName, data, opts = {}) =>
  putObject(certPath(certName), JSON.stringify(data), opts);
