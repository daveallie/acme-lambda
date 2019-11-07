export const toBase64 = rawString => Buffer.from(rawString).toString("base64");
export const fromBase64 = encodedString =>
  Buffer.from(encodedString, "base64").toString();
