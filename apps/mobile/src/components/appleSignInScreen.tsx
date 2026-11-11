import { View, Text, Platform, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";

import { signInWithApple } from "../api/apple_auth";
import { loggedUserDetails } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { syncPushToken } from "../utils/notification";
import { FontAwesome } from "@expo/vector-icons";
import { logger } from "@/utils/logger";
import type { SignInProgress } from "./auth/useSignInProgress";

const AppleLogin = ({
  setError,
  progress,
}: {
  setError: (msg: string) => void;
  progress: SignInProgress;
}) => {
  const router = useRouter();
  const loading = progress.active === "apple";
  const locked = progress.active !== null;
  const { setUserId, setOrgId } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAvailable);
  }, []);

  if (Platform.OS !== "ios" || !isAvailable) return null;

  const handleAppleLogin = async () => {
    progress.begin("apple");
    let failed = false;
    try {
      const res = await signInWithApple();

      if (!res.success) {
        failed = true;
        setError(res.message);
        return;
      }

      const userDetails = await loggedUserDetails();
      const { userId, orgId } = userDetails.data;

      setUserId(userId);
      setOrgId(orgId);
      progress.succeeded();

      try {
        // Prompts here and only here: sign-in is the moment the user expects to
        // be asked. The result is cached so sign-out can deregister without
        // re-raising the permission dialog.
        const token = await syncPushToken({ prompt: true });
        if (!token) {
          setError("Push notification setup failed. You may not receive alerts");
        }
      } catch (err) {
        logger.error("Push token error:", err);
        setError("Failed to enable push notifications");
      }

      router.replace("/protected/inbox");
    } catch (error) {
      failed = true;
      logger.error("Apple login error:", error);
      setError("Something went wrong.");
    } finally {
      progress.end({ failed });
    }
  };

  return (
    <View
      className="w-full flex items-center mt-3"
      style={{ opacity: locked && !loading ? 0.4 : 1 }}
    >
      <Pressable
        onPress={handleAppleLogin}
        disabled={locked}
        accessibilityState={{ busy: loading, disabled: locked }}
        className="bg-black py-3 rounded-md items-center flex-row justify-center w-[86vw] gap-2 dark:border dark:border-gray-500 active:opacity-80"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <FontAwesome name="apple" color="white" size={20} />
        )}
        <Text className="text-white font-medium text-[16px]">
          {loading ? "Signing in with Apple…" : "Sign in with Apple"}
        </Text>
      </Pressable>
    </View>
  );
};

export default AppleLogin;
