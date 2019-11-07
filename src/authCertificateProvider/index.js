import { parseCIDR, parse as parseIP } from "ipaddr.js";
import { SLS_PRODUCTION } from "../util/env";
import { getTagsForApiKey } from "../aws/apiGateway";
import { getCertificateNameHeader } from "../util/request";
import { fromBase64 } from "../util/base64";

const API_KEY_CERT_KEY = "enabledCerts";
const API_KEY_CIDR_KEY = "cidr";

const isIpInCidrRange = (ip, cidr) => {
  try {
    const parsedIp = parseIP(ip);
    const parsedCidr = parseCIDR(cidr);

    return parsedIp.match(parsedCidr);
  } catch (err) {
    console.error(err);
    return false;
  }
};

const generatePolicy = (principalId, effect, resource) => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: effect,
        Action: "execute-api:Invoke",
        Resource: resource
      }
    ]
  }
});

const eventArn = event =>
  SLS_PRODUCTION
    ? event.methodArn.replace(/\/prod\/.*/, "/prod/*/*")
    : event.methodArn.replace(/\/dev\/.*/, "/dev/*/*");

const getEventAuthDetails = event => {
  const requestCertName = getCertificateNameHeader(event);
  const apiKeyId = event.requestContext.identity.apiKeyId;
  const sourceIp = event.requestContext.identity.sourceIp;

  console.log(
    "Auth details:",
    JSON.stringify({ requestCertName, apiKeyId, sourceIp })
  );

  if (!requestCertName) {
    console.log("Missing cert name, rejecting");
    throw "Bad Request Parameters";
  }

  if (!apiKeyId) {
    console.log("Missing key ID, rejecting");
    throw "Unauthorized";
  }

  return { requestCertName, apiKeyId, sourceIp };
};

export default async event => {
  const { requestCertName, apiKeyId, sourceIp } = getEventAuthDetails(event);
  const apiKeyTags = await getTagsForApiKey(apiKeyId);
  const allowedCidr = apiKeyTags[API_KEY_CIDR_KEY];
  const base64AllowedCerts = apiKeyTags[API_KEY_CERT_KEY];

  if (!allowedCidr) {
    console.log("Missing allowed cidr, rejecting");
    throw "Unauthorized";
  }

  if (!base64AllowedCerts) {
    console.log("Missing allowed certs, rejecting");
    throw "Unauthorized";
  }

  if (!isIpInCidrRange(sourceIp, allowedCidr)) {
    console.log(`Source IP out of allowed range (${allowedCidr}), denying`);
    return generatePolicy("user", "Deny", eventArn(event));
  }

  const allowedCerts = fromBase64(base64AllowedCerts)
    .split(",")
    .map(certName => certName.toLowerCase());

  if (!allowedCerts.includes(requestCertName.toLowerCase())) {
    console.log("Missing specific cert, denying");
    return generatePolicy("user", "Deny", eventArn(event));
  }

  console.log("Allowing");
  return generatePolicy("user", "Allow", eventArn(event));
};
