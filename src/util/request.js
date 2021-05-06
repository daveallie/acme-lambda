const getHeaderValueFromEvent = (event, headerName) => {
  const lowerHeaderName = headerName.toLowerCase();
  const headerPair =
    Object.entries(event.headers).find(
      ([k]) => k.toLowerCase() === lowerHeaderName
    ) || [];
  return headerPair[1];
};

const CERT_NAME_HEADER = "x-certificate-name";
export const getCertificateNameHeader = (event) =>
  getHeaderValueFromEvent(event, CERT_NAME_HEADER);
