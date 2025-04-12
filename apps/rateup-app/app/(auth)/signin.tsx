import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  TouchableOpacity,
} from "react-native";
import React, { useRef, useState, useEffect } from "react";
import SignInScreen from "@/src/components/signInScreen";
import GoogleLogin from "@/src/components/googleSignInScreen";

const SignIn = () => {
  const screenHeight = Dimensions.get("window").height;
  const [error, setError] = useState("");
  const errorSlideX = useRef(new Animated.Value(300)).current;

  // Show animated toast when error changes
  useEffect(() => {
    if (error) {
      Animated.timing(errorSlideX, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      const timeout = setTimeout(() => {
        Animated.timing(errorSlideX, {
          toValue: 300,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => setError(""));
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [error]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      {/* Animated Toast */}
      {error ? (
        <Animated.View
          className="absolute top-6 right-4 z-50 bg-red-100 border-l-4 border-red-500 px-4 py-2 rounded-md shadow-md w-[85%] self-end"
          style={{
            transform: [{ translateX: errorSlideX }],
          }}
        >
          <Text className="text-red-700 font-medium text-sm">{error}</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        className="bg-white flex-1"
        contentContainerClassName="flex flex-grow px-6"
        keyboardShouldPersistTaps="handled"
        style={{ minHeight: screenHeight }}
      >
        <View className="flex-col gap-16 justify-around pt-[16vh] pb-[10vh] space-y-8 ">
          
          {/* Header */}
          <View className="flex flex-col items-center space-y-4 gap-6">
            <Image
              source={require("@/assets/images/signinpage_logo.png")}
              className="w-[63px] h-[60px]"
              resizeMode="contain"
            />
            <View>
              <Text className="text-center font-bold text-2xl leading-7 uppercase font-[Geist]">
                LOGIN TO RATEUP
              </Text>
              <Text className="text-[#7A8289] text-md mt-1 text-center font-[Geist]">
                It’s great to see you again!
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View className="space-y-8">
            <SignInScreen setError={setError} />
            <GoogleLogin setError={setError} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignIn;
