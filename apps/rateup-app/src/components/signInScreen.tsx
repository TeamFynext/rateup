import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { loggedUserDetails, signIn } from "@/src/api/api";
import ToggleSwitch from "toggle-switch-react-native";
import { EyeIcon } from "../constants/imageExports";
import { useAuth } from "../context/AuthContext";
import { registerForPushNotificationsAsync } from "../utils/notification";

export default function SignInScreen({
  setError,
}: {
  setError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const {setUserId,setOrgId} = useAuth();

  const router = useRouter();

  const handleSignIn = async () => {
    Keyboard.dismiss();
    setLoading(true);
    const response = await signIn(email, password);
    if (!response.success) {
      setError(response.message);
      setLoading(false);
    } else {
      const userDetails = await loggedUserDetails();
      const userData = userDetails.data;
      const { userId, orgId } = userData;
      setUserId(userId)
      setOrgId(orgId);
      const token = await registerForPushNotificationsAsync();
      console.log(token);
      router.replace("/protected/Home");
      setLoading(false);
    }
  };

  return (
    <View className="w-full px-2 relative">
      {/* Email */}
      <Text className="text-sm text-[#7A8289] mb-1 mt-8">Email Address</Text>
      <TextInput
        className="w-full border border-[#E2E5ED] rounded-md px-4 py-2 mb-4 text-gray-900"
        placeholder="Enter Your Email"
        placeholderTextColor="#E2E5ED"
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {/* Password */}
      <Text className="text-sm text-[#7A8289] mb-1">Password</Text>
      <View className="flex-row items-center border border-[#E2E5ED] rounded-md px-4 py-2 mb-2">
        <TextInput
          className="flex-1 text-gray-900"
          placeholder="Enter Password"
          placeholderTextColor="#E2E5ED"
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <EyeIcon />
        </TouchableOpacity>
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
          <Text className="ml-2 text-sm text-[#343A40]">Remember Me</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/auth/ForgotPassword")}>
          <Text className="text-[#004F98] text-sm font-medium">
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        onPress={handleSignIn}
        className={`py-3 rounded-md mb-4 items-center ${
          loading ? "bg-[#7AA5C8]" : "bg-[#004F98]"
        }`}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-[16px]">
          {loading ? "Signing In..." : "Sign In"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
