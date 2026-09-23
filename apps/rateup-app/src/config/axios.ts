import axios from "axios";
import { router } from "expo-router";
import SuperTokens from "supertokens-react-native";

const instance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  withCredentials: true,
});

SuperTokens.addAxiosInterceptors(instance);

/**
 * RateUp staff suspended this organisation: the API refuses every request with 403
 * ORG_SUSPENDED until they restore it. Send the app to the suspended screen once, however
 * many queries fail at the same time; signing out from there resets it.
 */
let suspendedRedirected = false;

export function clearSuspendedRedirect() {
  suspendedRedirected = false;
}

instance.interceptors.response.use(undefined, (error) => {
  if (error?.response?.status === 403 && error.response.data?.code === "ORG_SUSPENDED") {
    if (!suspendedRedirected) {
      suspendedRedirected = true;
      router.replace("/suspended");
    }
  }
  return Promise.reject(error);
});

export default instance;
