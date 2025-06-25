export const appInfo = {
  // learn more about this on https://supertokens.com/docs/thirdpartyemailpassword/appinfo
  appName: "rateup",
  apiDomain: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  websiteDomain:
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
  apiBasePath: "/api/auth",
  websiteBasePath: "/login",
};
