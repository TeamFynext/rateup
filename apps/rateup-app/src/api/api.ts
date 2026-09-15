import axios from "@/config/axios";
import { router } from "expo-router";
import SuperTokens from "supertokens-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unregisterPushToken } from "../utils/notification";
import { clearLocalUserData } from "../utils/clearLocalData";
import { Toast } from "@/components/common/Notice";

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
        message: "Incorrect email or password. Please try again.",
      };
    }
    const token = await SuperTokens.getAccessToken();
    if (!token) {
      return {
        success: false,
        message: "Authentication error. Please try again",
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
      message: err?.response?.data?.message || "Sign in failed. Please try again.",
    };
  }
};

export const signOut = async () => {
  try {
    // Best effort, and deliberately not awaited into the failure path below:
    // the device should still be cleared even if the server cannot be told to
    // stop pushing to it.
    try {
      await unregisterPushToken();
    } catch (error) {
      console.error("Failed to unregister the push token on sign-out:", error);
    }

    await SuperTokens.signOut();
    return { success: true };
  } catch {
    return {
      success: false,
      message: "Sign Out failed. Please try again",
    };
  } finally {
    // Runs on both paths on purpose. If the session teardown fails we are left
    // signed in locally, and leaving the previous account's contacts and
    // messages on disk is the outcome worth avoiding most: the schema has no
    // per-account scoping, so the next sign-in would hydrate them.
    await clearLocalUserData();
    router.replace("/auth/SignIn");
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/user/password/reset/token`, {
      formFields: [{ id: "email", value: email }],
    });

    const data = response.data;

    if (data.status === "OK") {
      return {
        success: true,
        message: "Reset link sent successfully",
      };
    } else if (data.status === "FIELD_ERROR") {
      const errorMsg = data.formFields?.[0]?.error || "Invalid email format or missing email";
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
  } catch {
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

export const updateActiveStatus = (userId: string) =>
  axios({
    url: `/api/user/update-active-status/${userId}`,
    method: "PUT",
  });

export function useUpdateActiveStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => updateActiveStatus(userId),

    onSuccess: () => {
      Toast.success("Account deleted successfully!");

      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["loggedUser"] });
    },

    onError: (error: any) => {
      console.error("Error deleting member", error?.message);

      Toast.error(error?.message || "Something went wrong");
    },
  });
}
