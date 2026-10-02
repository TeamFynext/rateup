import { useColorScheme } from "nativewind";
import { useState } from "react";
import { View, Text, TextInput, Pressable, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { loggedUserDetails, signIn } from "@/api/api";
import ToggleSwitch from "toggle-switch-react-native";
import { Eye, EyeClosed } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { syncPushToken } from "../utils/notification";

export default function SignInScreen({ setError }: { readonly setError: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { setUserId, setOrgId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const router = useRouter();

  const handleSignIn = async () => {
    Keyboard.dismiss();
    setLoading(true);

    if (!email || !password) {
      setError("Email and Password required");
      setLoading(false);
      return;
    }

    try {
      const response = await signIn(email, password);

      if (!response.success) {
        setError(response.message);
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
          setError("Notification setup failed. You may not receive alerts.");
        }
      } catch (tokenError) {
        console.error("Error registering for push notifications:", tokenError);
        setError("Failed to enable notifications");
      }

      router.replace("/protected/inbox");
    } catch (err) {
      console.error("Unexpected error during sign-in:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="w-full px-2 relative">
      {/* Email */}
      {/* Email */}
      <Text className="text-sm text-[#7A8289] dark:text-gray-400 mb-1 mt-8">Email Address</Text>

      <TextInput
        className="w-full h-14 border border-[#E2E5ED] dark:border-[#2A2A2A] rounded-md px-4 mb-4 text-gray-900 dark:text-white bg-white dark:bg-[#111111]"
        placeholder="Enter Your Email"
        placeholderTextColor="#9CA3AF"
        onChangeText={setEmail}
        autoCapitalize="none"
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
          <ToggleSwitch
            isOn={rememberMe}
            onToggle={setRememberMe}
            onColor="#004F98"
            offColor="#F5F5F5"
            trackOnStyle={{
              height: 20,
              width: 40,
              borderRadius: 999,
              padding: 0,
            }}
            trackOffStyle={{
              height: 20,
              width: 40,
              borderRadius: 999,
              padding: 0,
            }}
            thumbOnStyle={{
              backgroundColor: "#FFFFFF",
              width: 14,
              height: 14,
              borderRadius: 999,
            }}
            thumbOffStyle={{
              backgroundColor: "#343A40",
              width: 14,
              height: 14,
              borderRadius: 999,
            }}
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
        className={`py-3 rounded-md mb-4 items-center ${loading ? "bg-[#7AA5C8]" : "bg-[#004F98]"}`}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-[16px]">
          {loading ? "Signing In..." : "Sign In"}
        </Text>
      </Pressable>
    </View>
  );
}
