import "babel-polyfill";
import "source-map-support/register";
import certificateProvisioning from "./certificateProvisioning";
import authCertificateProvider from "./authCertificateProvider";
import certificateProvider from "./certificateProvider";
import buildApiKey from "./buildApiKey";

export const certificateProvisioningHandler = async () =>
  await certificateProvisioning();
export const authCertificateProviderHandler = async event =>
  await authCertificateProvider(event);
export const certificateProviderHandler = async event =>
  await certificateProvider(event);
export const buildApiKeyHandler = async event => await buildApiKey(event);
