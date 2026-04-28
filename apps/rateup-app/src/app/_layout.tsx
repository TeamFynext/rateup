import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar, useColorScheme } from "react-native";
import ToastManager from "toastify-react-native";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react-native";
import "../global.css";

export const queryClient = new QueryClient();

function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? colors["slate-950"] : "white"}
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? colors["slate-950"] : "white",
          },
        }}
      >
        <Stack.Screen name="index" />
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
        <ToastManager
          icons={{
            success: <CheckCircle size={18} color="green" />,
            error: <XCircle size={18} color="red" />,
            info: <Info size={18} color="blue" />,
            warn: <AlertTriangle size={18} color="orange" />,
            default: <Info size={18} color="gray" />,
          }}
          closeIcon={<XCircle size={18} color="gray" />}
          textStyle={{ fontSize: 11 }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
