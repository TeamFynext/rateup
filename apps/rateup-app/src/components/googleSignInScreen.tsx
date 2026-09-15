import { View, Text, TouchableOpacity } from "react-native";
import { signInWithGoogle } from "../api/google_auth";
import { useEffect, useState } from "react";
import { configureGoogleSignIn } from "../config/googleConfig";
import { useRouter } from "expo-router";
import { GoogleIcon } from "../constants/imageExports";
import { loggedUserDetails } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { syncPushToken } from "../utils/notification";

const GoogleLogin = ({ setError }: { setError: (msg: string) => void }) => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const { setUserId, setOrgId } = useAuth();

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await signInWithGoogle();

      if (!res.success) {
        setError(res.message);
        setLoading(false);
        return;
      }

      const userDetails = await loggedUserDetails();
      const userData = userDetails.data;
      const { userId, orgId } = userData;

      setUserId(userId);
      setOrgId(orgId);

      try {
        // Prompts here and only here: sign-in is the moment the user expects to
        // be asked. The result is cached so sign-out can deregister without
        // re-raising the permission dialog.
        const token = await syncPushToken({ prompt: true });
        if (!token) {
          setError("Push notification setup failed. You may not recieve alerts");
        }
      } catch (tokenError) {
        console.error("Push token registration error:", tokenError);
        setError("Failed to enable push notifications");
      }

      router.replace("/protected/inbox");
    } catch (error) {
      console.error("Unexpected Google login error:", error);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="w-full flex items-center">
      <TouchableOpacity
        className="bg-[#C4D7F5] py-3 rounded-md items-center flex-row justify-center w-[86vw] gap-2"
        onPress={handleLogin}
        disabled={loading}
      >
        <GoogleIcon />
        <Text className="text-[#004F98] font-medium text-[16px]">
          {loading ? "Please Wait..." : "Sign in with Google"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default GoogleLogin;
