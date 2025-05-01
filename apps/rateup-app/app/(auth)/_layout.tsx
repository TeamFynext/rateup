import React from "react";
import { Stack } from "expo-router";
import "@/global.css";

const AuthLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="SignIn" options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" options={{ headerShown: false }} />
    </Stack>
  );
};

export default AuthLayout;
