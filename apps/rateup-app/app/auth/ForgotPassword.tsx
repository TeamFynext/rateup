import { sendPasswordResetEmail } from "@/src/api/api";
import { BackIcon, MessageIcon } from "@/src/constants/imageExports";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";

const { width, height } = Dimensions.get("window");

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleResetPassword = async () => {
    if (!email) {
      toast.show("Please enter your email.", { type: "danger" });
      return;
    }

    setLoading(true);
    const response = await sendPasswordResetEmail(email);
    setLoading(false);

    if (response.success) {
      toast.show(response.message, {
        type: "success",
        duration: 5000,
      });
    } else {
      toast.show(response.message, {
        type: "danger",
        duration: 5000,
      });
    }
  };

  return (
    <SafeAreaView className="flex gap-20 bg-white px-4 pt-6 h-full">
      {/* Header */}
      <TouchableOpacity
        className="flex-row items-center mb-6 justify-start"
        onPress={() => router.replace("/auth/SignIn")}
      >
        <BackIcon height={25} width={25} />
        <Text className="text-xl font-bold ml-2">Reset Password</Text>
      </TouchableOpacity>

      {/* Image Placeholder */}
      <View
        className="items-center justify-center"
        style={{ height: height * 0.2 }}
      >
        <View className="bg-[#C4D7F5] p-4 rounded-lg h-[80px] w-[80px] flex items-center justify-center">
          <MessageIcon />
        </View>
        <Text className="text-center text-[#7A8289] mt-4 mb-8 text-lg">
          Please check your email for{"\n"}password reset link.
        </Text>
      </View>

      {/* Email Input & Button */}
      <View>
        <View className="mb-4">
          <Text className="text-sm text-[#7A8289] mb-2">Email Id</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter Your Email"
            placeholderTextColor="#E2E5ED"
            className="border border-[#E2E5ED] rounded-md px-4 py-3 text-sm"
          />
        </View>

        <TouchableOpacity
          className="bg-[#004F98] py-3 rounded-md"
          onPress={handleResetPassword}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-xl">
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
