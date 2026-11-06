import { Toast } from "@/components/common/Notice";
import { sendPasswordResetEmail } from "@/api/api";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Dimensions, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = useColorScheme() === "dark";

  const handleResetPassword = async () => {
    if (!email) {
      Toast.show({
        type: "error",
        text1: "Please enter your email.",
      });
      return;
    }

    setLoading(true);

    const response = await sendPasswordResetEmail(email);

    setLoading(false);

    if (response.success) {
      Toast.show({
        type: "success",
        text1: response.message,
      });
    } else {
      Toast.show({
        type: "error",
        text1: response.message,
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 gap-20 bg-white dark:bg-black px-4 pt-6">
      {/* Header */}
      <Pressable
        className="flex-row items-center mb-6 justify-start"
        onPress={() => router.replace("/auth/SignIn")}
      >
        <ArrowLeft color={isDark ? "white" : "black"} />

        <Text className="text-xl font-bold ml-2 text-black dark:text-white">Reset Password</Text>
      </Pressable>

      {/* Icon Section */}
      <View className="items-center justify-center" style={{ height: height * 0.2 }}>
        <View className="bg-[#C4D7F5] dark:bg-[#1E3A5F] p-4 rounded-lg h-[80px] w-[80px] flex items-center justify-center">
          <Mail color={isDark ? "white" : "black"} />
        </View>

        <Text className="text-center text-[#7A8289] dark:text-gray-400 mt-4 mb-8 text-lg">
          Please check your email for{"\n"}password reset link.
        </Text>
      </View>

      {/* Email Input & Button */}
      <View>
        <View className="mb-4">
          <Text className="text-sm text-[#7A8289] dark:text-gray-400 mb-2">Email Id</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter Your Email"
            placeholderTextColor="#9CA3AF"
            className="h-14 border border-[#E2E5ED] dark:border-[#2A2A2A] rounded-md px-4 text-sm text-black dark:text-white bg-white dark:bg-[#111111]"
          />
        </View>

        <Pressable
          className={`py-3 rounded-md ${loading ? "bg-[#7AA5C8]" : "bg-[#004F98]"}`}
          onPress={handleResetPassword}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-xl">
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
