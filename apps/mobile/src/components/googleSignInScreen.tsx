import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { signInWithGoogle } from "../api/google_auth";
import { useEffect } from "react";
import { configureGoogleSignIn } from "../config/googleConfig";
import { useRouter } from "expo-router";
import { GoogleIcon } from "../constants/imageExports";
import { loggedUserDetails } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { syncPushToken } from "../utils/notification";
import { logger } from "@/utils/logger";
import type { SignInProgress } from "./auth/useSignInProgress";

const GoogleLogin = ({
  setError,
  progress,
}: {
  setError: (msg: string) => void;
  progress: SignInProgress;
}) => {
  const router = useRouter();
  const loading = progress.active === "google";
  const locked = progress.active !== null;
  const { setUserId, setOrgId } = useAuth();

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleLogin = async () => {
    progress.begin("google");
    let failed = false;
    try {
      const res = await signInWithGoogle();

      if (!res.success) {
        failed = true;
        setError(res.message);
        return;
      }

      const userDetails = await loggedUserDetails();
      const userData = userDetails.data;
      const { userId, orgId } = userData;

      setUserId(userId);
      setOrgId(orgId);
      progress.succeeded();

      try {
        // Prompts here and only here: sign-in is the moment the user expects to
        // be asked. The result is cached so sign-out can deregister without
        // re-raising the permission dialog.
        const token = await syncPushToken({ prompt: true });
        if (!token) {
          setError("Push notification setup failed. You may not recieve alerts");
        }
      } catch (tokenError) {
        logger.error("Push token registration error:", tokenError);
        setError("Failed to enable push notifications");
      }

      router.replace("/protected/inbox");
    } catch (error) {
      failed = true;
      logger.error("Unexpected Google login error:", error);
      setError("Something went wrong.");
    } finally {
      progress.end({ failed });
    }
  };

  return (
    <View className="w-full flex items-center" style={{ opacity: locked && !loading ? 0.4 : 1 }}>
      <Pressable
        className="bg-[#C4D7F5] py-3 rounded-md items-center flex-row justify-center w-[86vw] gap-2 active:opacity-80"
        onPress={handleLogin}
        disabled={locked}
        accessibilityState={{ busy: loading, disabled: locked }}
      >
        {loading ? <ActivityIndicator color="#004F98" size="small" /> : <GoogleIcon />}
        <Text className="text-[#004F98] font-medium text-[16px]">
          {loading ? "Signing in with Google…" : "Sign in with Google"}
        </Text>
      </Pressable>
    </View>
  );
};

export default GoogleLogin;
