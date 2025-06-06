import axios from "axios";
import SuperTokens from "supertokens-react-native";

const instance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  withCredentials: true,
});

SuperTokens.addAxiosInterceptors(instance);

export default instance;
