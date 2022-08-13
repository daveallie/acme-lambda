import { createApiKey } from "../aws/apiGateway";
import { PRODUCTION } from "../util/env";
import { toBase64 } from "../util/base64";

export default async (event) => {
  const keyName = `acme-lambda${PRODUCTION ? "" : "-dev"}-${event.name}`;
  const params = {
    name: keyName,
    enabled: true,
    tags: {
      enabledCerts: toBase64(event.enabledCerts.join(",")),
      cidr: event.cidr,
    },
  };

  await createApiKey(params);

  console.log(`Key created: ${keyName}`);
};
