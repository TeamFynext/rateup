import React from "react";
import { Stack } from "expo-router";
import "@/global.css";
import { ToastProvider } from "react-native-toast-notifications";
import { CustomToast } from "@/src/components/CustomToast";

const AuthLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="SignIn" options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" options={{ headerShown: false }} />
    </Stack>
  );
};

function AuthLayoutWrapper() {
  return (
    <ToastProvider
      placement="top"
      duration={3000}
      animationType="slide-in"
      renderToast={(toastOptions) => (
        <CustomToast
          //@ts-ignore
          message={toastOptions.message}
          //@ts-ignore
          type={toastOptions.type}
        />
      )}
      offsetTop={40}
    >
      <AuthLayout />
    </ToastProvider>
  );
}

export default AuthLayoutWrapper;
