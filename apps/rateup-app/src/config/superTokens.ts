import SuperTokens from "supertokens-react-native";

SuperTokens.init({
  //@ts-ignore
  apiDomain: process.env.EXPO_PUBLIC_API_URL,
  apiBasePath: "/api/auth",
  sessionTokenBackendDomain: process.env.EXPO_PUBLIC_API_URL,
});

export default SuperTokens;
