import React from "react";
import { Stack } from "expo-router";

const WebFormLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WebForm" />
      <Stack.Screen name="WebFormFilter" />
      <Stack.Screen name="[webformId]" />
    </Stack>
  );
};

export default WebFormLayout;
