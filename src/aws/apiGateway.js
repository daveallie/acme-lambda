import { APIGateway } from "aws-sdk";

const apiGateway = new APIGateway({ region: process.env.AWS_REGION });

export const getTagsForApiKey = apiKeyId => {
  const arn = `arn:aws:apigateway:${process.env.AWS_REGION}::/apikeys/${apiKeyId}`;

  return apiGateway
    .getTags({ resourceArn: arn })
    .promise()
    .then(tagData => tagData.tags)
    .catch(e => {
      console.error(e);
      return {};
    });
};

export const createApiKey = async createApiKeyParams => {
  const key = await apiGateway.createApiKey(createApiKeyParams).promise();

  const createUsagePlanKeyParams = {
    keyId: key.id,
    keyType: "API_KEY",
    usagePlanId: process.env.API_GATEWAY_USAGE_PLAN_ID
  };

  await apiGateway.createUsagePlanKey(createUsagePlanKeyParams).promise();

  return key;
};
