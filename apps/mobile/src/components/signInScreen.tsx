import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  Switch,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { loggedUserDetails, signIn } from "@/api/api";
import { Eye, EyeClosed } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { syncPushToken } from "../utils/notification";
import { logger } from "@/utils/logger";
import type { SignInProgress } from "./auth/useSignInProgress";

/**
 * "Remember Me" saves the email here so the next sign-in starts with it filled in.
 * Sign-out keeps it on purpose (it is not in clearLocalData's account keys).
 */
export const REMEMBERED_EMAIL_KEY = "rateup:auth:remembered-email";

export default function SignInScreen({
  setError,
  progress,
}: {
  readonly setError: (msg: string) => void;
  readonly progress: SignInProgress;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { setUserId, setOrgId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const router = useRouter();
  const loading = progress.active === "email";
  // Another method is signing in: this form waits, dimmed.
  const locked = progress.active !== null;

  useEffect(() => {
    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY)
      .then((saved) => {
        if (!saved) return;
        // Don't overwrite anything the user typed before storage answered.
        setEmail((current) => current || saved);
        setRememberMe(true);
      })
      .catch((err) => logger.error("Failed to read remembered email:", err));
  }, []);

  const saveRememberedEmail = async (signedInEmail: string) => {
    try {
      if (rememberMe) await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, signedInEmail);
      else await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch (err) {
      logger.error("Failed to save remembered email:", err);
    }
  };

  const handleSignIn = async () => {
    Keyboard.dismiss();

    if (!email || !password) {
      setError("Email and Password required");
      progress.end({ failed: true });
      return;
    }
    progress.begin("email");
    let failed = false;

    try {
      const response = await signIn(email, password);

      if (!response.success) {
        failed = true;
        setError(response.message);
        return;
      }

      await saveRememberedEmail(email.trim());

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
          setError("Notification setup failed. You may not receive alerts.");
        }
      } catch (tokenError) {
        logger.error("Error registering for push notifications:", tokenError);
        setError("Failed to enable notifications");
      }

      router.replace("/protected/inbox");
    } catch (err) {
      failed = true;
      logger.error("Unexpected error during sign-in:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      progress.end({ failed });
    }
  };

  return (
    <View
      className="w-full px-2 relative"
      style={{ opacity: locked && !loading ? 0.4 : 1 }}
      pointerEvents={locked ? "none" : "auto"}
    >
      {/* Email */}
      <Text className="text-sm text-[#7A8289] dark:text-gray-400 mb-1 mt-8">Email Address</Text>

      <TextInput
        className="w-full h-14 border border-[#E2E5ED] dark:border-[#2A2A2A] rounded-md px-4 mb-4 text-gray-900 dark:text-white bg-white dark:bg-[#111111]"
        placeholder="Enter Your Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!locked}
      />

      {/* Password */}
      <Text className="text-sm text-[#7A8289] dark:text-gray-400 mb-1">Password</Text>

      <View className="flex-row items-center h-14 border border-[#E2E5ED] dark:border-[#2A2A2A] rounded-md px-4 mb-2 bg-white dark:bg-[#111111]">
        <TextInput
          className="flex-1 text-gray-900 dark:text-white"
          placeholder="Enter Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
          autoCapitalize="none"
          editable={!locked}
        />

        <Pressable onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? (
            <Eye color={isDark ? "white" : "black"} strokeWidth={1} />
          ) : (
            <EyeClosed color={isDark ? "white" : "black"} strokeWidth={1} />
          )}
        </Pressable>
      </View>

      {/* Remember Me + Forgot Password */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center">
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: "#E2E5ED", true: "#004F98" }}
            ios_backgroundColor="#E2E5ED"
            thumbColor="#FFFFFF"
            accessibilityLabel="Remember Me"
          />
          <Text className="ml-2 text-sm text-[#343A40] dark:text-white">Remember Me</Text>
        </View>
        <Pressable onPress={() => router.push("/auth/ForgotPassword")}>
          <Text className="text-[#004F98] dark:text-blue-400 text-sm font-medium">
            Forgot Password?
          </Text>
        </Pressable>
      </View>

      {/* Sign In Button */}
      <Pressable
        onPress={handleSignIn}
        className="py-3 rounded-md mb-4 items-center flex-row justify-center bg-[#004F98] active:opacity-80"
        disabled={locked}
        accessibilityState={{ busy: loading, disabled: locked }}
      >
        {loading && <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />}
        <Text className="text-white font-semibold text-[16px]">
          {loading ? "Signing in…" : "Sign In"}
        </Text>
      </Pressable>
    </View>
  );
}
