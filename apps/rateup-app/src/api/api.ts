import axios from "@/config/axios";
import { router } from "expo-router";
import SuperTokens from "supertokens-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { registerForPushNotificationsAsync } from "../utils/notification";
import { deleteToken } from "./notification";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface ICreateGoogleUser {
  name: string;
  orgName: string;
  type: string;
  email?: string;
}

export const signIn = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/signin`, {
      formFields: [
        { id: "email", value: email },
        { id: "password", value: password },
      ],
    });

    const sessionExists = await SuperTokens.doesSessionExist();
    if (!sessionExists) {
      return {
        success: false,
        message: "Session could not be created",
      };
    }
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Token not found",
      };
    }
    await AsyncStorage.setItem("accessToken", token);

    return {
      success: true,
      data: response,
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        err?.response?.data?.message || "Sign in failed. Please try again.",
    };
  }
};

export const signOut = async () => {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await deleteToken(token);
    }
    await AsyncStorage.removeItem("accessToken");
    await SuperTokens.signOut();
    router.replace("/auth/SignIn");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: "Sign Out failed. Please try again",
    };
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/user/password/reset/token`,
      {
        formFields: [{ id: "email", value: email }],
      }
    );

    const data = response.data;

    if (data.status === "OK") {
      return {
        success: true,
        message: "Reset link sent successfully",
      };
    } else if (data.status === "FIELD_ERROR") {
      const errorMsg =
        data.formFields?.[0]?.error || "Invalid email format or missing email";
      return {
        success: false,
        message: errorMsg,
      };
    } else {
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: "Send failed. Check your network or try again later.",
    };
  }
};

export const loggedUserDetails = async () => {
  const res = await axios.get("/api/user/info");
  return res.data;
};

export const useLoggedInUser = () =>
  useQuery({
    queryKey: ["loggedUser"],
    queryFn: async () => {
      const res = await loggedUserDetails();
      return res.data;
    },
  });

export const createGoogleUser = async (data: ICreateGoogleUser) => {
  await axios.post("/user/complete-google-signup", data);
};

export async function deleteOrg(orgId: string) {
  return await axios.delete(`/api/org/${orgId}`);
}