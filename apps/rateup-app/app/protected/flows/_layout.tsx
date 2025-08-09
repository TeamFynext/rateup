import React from "react";
import { Stack } from "expo-router";

const FlowLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Flow" />
      <Stack.Screen name="FlowFilter" />
      <Stack.Screen name="[flowId]" />
    </Stack>
  );
};

export default FlowLayout;
