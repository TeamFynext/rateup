import { Platform } from "react-native";
import axios from "../config/axios";

/**
 * The platform rides along so an incoming call can ring each phone the right way: a
 * data-only push that wakes a closed Android app, CallKit on iOS.
 */
export const addToken = async (token: string) => {
  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined;
  const res = await axios.post("/api/mobile-notifications", { expoToken: token, platform });
  return res.data;
};

/** This iPhone's PushKit token, which lets a call ring through CallKit with the app closed. */
export const addVoipToken = async (token: string) => {
  await axios.post("/api/mobile-notifications/voip", { token });
};

export const getToken = async () => {
  const res = await axios.get("/api/mobile-notifications");
  return res.data;
};

export const deleteToken = async (token: string) => {
  const res = await axios.delete("/api/mobile-notifications", {
    data: {
      expoToken: token,
    },
  });
  return res.data;
};
