import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import React from "react";
import SignInScreen from "@/src/components/signInScreen";
import GoogleLogin from "@/src/components/googleSignInScreen";
import { RateLogo } from "@/src/constants/imageExports";
import { useToast } from "react-native-toast-notifications";

const SignIn = () => {
  const screenHeight = Dimensions.get("window").height;
  const toast = useToast();

  const showError = (message: string) => {
    toast.show(message, {
      type: "danger",
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // Adjust as needed
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex flex-col items-center space-y-4 mb-8">
            <RateLogo height={64} />
            <View>
              <Text className="text-center font-bold text-2xl uppercase font-[Geist]">
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
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default SignIn;
