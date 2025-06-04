import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        statusBarStyle:"light",
        statusBarBackgroundColor:"transparent"
      }}
    >
      <Stack.Screen name="protected" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}
