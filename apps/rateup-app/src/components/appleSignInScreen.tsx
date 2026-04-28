import { View, Text, Platform, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";

import { signInWithApple } from "../api/apple_auth";
import { loggedUserDetails } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { registerForPushNotificationsAsync } from "../utils/notification";
import { addToken } from "../api/notification";
import { IconBrandAppleFilled } from "@tabler/icons-react-native";

const AppleLogin = ({ setError }: { setError: (msg: string) => void }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { setUserId, setOrgId } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAvailable);
  }, []);

  if (Platform.OS !== "ios" || !isAvailable) return null;

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const res = await signInWithApple();

      if (!res.success) {
        setError(res.message);
        return;
      }

      const userDetails = await loggedUserDetails();
      const { userId, orgId } = userDetails.data;

      setUserId(userId);
      setOrgId(orgId);

      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await addToken(token);
        } else {
          setError(
            "Push notification setup failed. You may not receive alerts",
          );
        }
      } catch (err) {
        console.error("Push token error:", err);
        setError("Failed to enable push notifications");
      }

      router.replace("/protected/inbox");
    } catch (error) {
      console.error("Apple login error:", error);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="w-full flex items-center mt-3">
      <Pressable
        onPress={handleAppleLogin}
        disabled={loading}
        className="bg-black py-3 rounded-md items-center flex-row justify-center w-[86vw] gap-1"
      >
        <IconBrandAppleFilled color="white" size={20} />
        <Text className="text-white font-medium text-[16px]">
          {loading ? "Please Wait..." : "Sign in with Apple"}
        </Text>
      </Pressable>
    </View>
  );
};

export default AppleLogin;
