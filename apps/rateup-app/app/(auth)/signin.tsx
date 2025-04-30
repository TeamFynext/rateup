import {
  View,
  Text,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import React from "react";
import SignInScreen from "@/src/components/SignInScreen";
import GoogleLogin from "@/src/components/GoogleSignInScreen";
import { RateLogo } from "@/src/constants/imageExports";
import { useToast } from "react-native-toast-notifications"; // ✅ import the toast hook

const SignIn = () => {
  const screenHeight = Dimensions.get("window").height;
  const toast = useToast(); // ✅ initialize toast

  // Function to trigger toast
  const showError = (message: string) => {
    toast.show(message, { type: "danger" });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="bg-white flex-1"
        contentContainerClassName="flex flex-grow px-6"
        keyboardShouldPersistTaps="handled"
        style={{ minHeight: screenHeight }}
      >
        <View className="flex-col gap-16 justify-around pt-[16vh] pb-[10vh] space-y-8">
          {/* Header */}
          <View className="flex flex-col items-center space-y-4 gap-6">
            <RateLogo height={64} />
            <View>
              <Text className="text-center font-bold text-2xl leading-7 uppercase font-[Geist]">
                LOGIN TO RATEUP
              </Text>
              <Text className="text-[#7A8289] text-md mt-1 text-center font-[Geist]">
                It's great to see you again!
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View className="space-y-8">
            <SignInScreen setError={showError} />
            <GoogleLogin setError={showError} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignIn;
