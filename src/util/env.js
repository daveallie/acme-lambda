export const SLS_ENV = process.env.SLS_ENV;
export const NODE_PRODUCTION = process.env.NODE_ENV === "production";
export const SLS_PRODUCTION = SLS_ENV === "prod";
export const PRODUCTION = NODE_PRODUCTION && SLS_PRODUCTION;
