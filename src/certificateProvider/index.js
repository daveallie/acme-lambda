import { getS3CertificateData } from "../aws/s3";
import { getCertificateNameHeader } from "../util/request";

export default async event => {
  const ifModSince = JSON.parse(event.body || "{}").IfModifiedSince;
  const requestedCertName = getCertificateNameHeader(event);

  const opts = ifModSince ? { IfModifiedSince: new Date(ifModSince) } : {};

  return await getS3CertificateData(requestedCertName, opts)
    .then(data => data.Body.toString())
    .then(certData => ({ statusCode: 200, body: certData }))
    .catch(e => {
      if (e && e.code) {
        if (e.code === "NoSuchKey") {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: "No known cert with that name" })
          };
        }

        if (e.code === "NotModified") {
          return { statusCode: 304 };
        }
      }

      console.log(e);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Unknown error" })
      };
    });
};
