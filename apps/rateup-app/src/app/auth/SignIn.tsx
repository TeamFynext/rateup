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
import { SafeAreaView } from "react-native-safe-area-context";
import AppleLogin from "@/components/appleSignInScreen";
import { StarMark } from "@/constants/imageExports";

const SignIn = () => {
  const showError = (message: string) => {
    Toast.show({
      type: "error",
      text1: message,
      visibilityTime: 5000,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
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
                {/* The star mark on its own, not the full logo: the wordmark would
                    repeat the "LOGIN TO RATEUP" heading directly below. Drawn
                    from the source SVG so it stays crisp and allocates no
                    bitmap, rather than decoding a 1024px PNG for a 64pt icon. */}
                <StarMark width={64} height={64} />

                <View>
                  <Text className="text-center font-bold text-2xl uppercase font-[Geist] text-black dark:text-white">
                    LOGIN TO RATEUP
                  </Text>

                  <Text className="text-md mt-1 text-center font-[Geist] text-[#7A8289] dark:text-gray-400">
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
