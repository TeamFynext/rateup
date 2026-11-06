export const appInfo = {
  // learn more about this on https://supertokens.com/docs/thirdpartyemailpassword/appinfo
  appName: "rateup",
  apiDomain: import.meta.env.VITE_API_URL || "http://localhost:3001",
  websiteDomain: import.meta.env.VITE_FRONTEND_URL || "http://localhost:3000",
  apiBasePath: "/api/auth",
  websiteBasePath: "/login",
};
