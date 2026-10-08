import axios from "@/config/axios";
import { router } from "expo-router";
import SuperTokens from "supertokens-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unregisterPushToken } from "../utils/notification";
import { clearLocalUserData } from "../utils/clearLocalData";

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

/** The API re-checks the password on a self-delete; a Google-only account sends none. */
export const updateActiveStatus = (userId: string, password?: string) =>
  axios({
    url: `/api/user/update-active-status/${userId}`,
    method: "PUT",
    data: password ? { password } : {},
  });

export function useUpdateActiveStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password?: string }) =>
      updateActiveStatus(userId, password),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["loggedUser"] });
    },
  });
}

export interface UserProfileData {
  name?: string | null;
  profilePhoto?: string | null;
  hasPassword?: boolean;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  phone?: string | null;
}

export const useUserProfile = () =>
  useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await axios.get("/api/user/profile");
      return res.data.data as UserProfileData;
    },
  });

/**
 * Renames the user. Title and phone are resent from the stored profile: the endpoint
 * overwrites both, and older API builds reject the request without them.
 */
export const updateProfileName = (name: string, profile?: UserProfileData) =>
  axios.put("/api/user/update-profile", {
    name,
    title: profile?.gender ?? undefined,
    phone: profile?.phone ?? "",
  });

export const updateProfilePhoto = (profilePhoto: string) =>
  axios.put("/api/user/update-profile-photo", { profilePhoto });

export type AvailabilityStatus = "online" | "busy" | "offline";
export type PresenceMode = "automatic" | "manual";

export const updateAvailability = (data: {
  status: AvailabilityStatus;
  presenceMode: PresenceMode;
}) => axios.put("/api/user/status", data);

export const changePassword = (data: { existingPassword: string; newPassword: string }) =>
  axios.post("/api/user/change-password", data);

/** The API's own `message`, which says what went wrong ("Incorrect password"). */
export function serverMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  return typeof message === "string" && message ? message : fallback;
}
