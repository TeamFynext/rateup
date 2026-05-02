import { Toast } from "toastify-react-native";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import React from "react";
import SignInScreen from "@/components/signInScreen";
import GoogleLogin from "@/components/googleSignInScreen";
import { RateLogo } from "@/constants/imageExports";
import { SafeAreaView } from "react-native-safe-area-context";
import AppleLogin from "@/components/appleSignInScreen";

const SignIn = () => {
  const showError = (message: string) => {
    Toast.show({
      type: "error",
      text1: message,
      visibilityTime: 5000,
    });
  };

  return (
    <SafeAreaView className="flex-grow">
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
              gap: 100,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="space-y-8">
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
              <SignInScreen setError={showError} />
              <GoogleLogin setError={showError} />
              <AppleLogin setError={showError} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
