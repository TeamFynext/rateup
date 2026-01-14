import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const queryClient = new QueryClient();

function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "black" : "white"}
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? "black" : "white",
          },
        }}
      >
        <Stack.Screen name="protected" />
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}

export default function LayoutWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RootLayout />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
