import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Stack } from "expo-router";
import { StatusBar, useColorScheme, Text, TextInput } from "react-native";
import { Colors } from "@/constants/colors";
import ToastManager from "toastify-react-native";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react-native";
import {
  useFonts,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import "../global.css";

// Monkey-patch Text and TextInput components to use Nunito_400Regular as the global default font
if ((Text as any).defaultProps) {
  (Text as any).defaultProps.style = {
    fontFamily: "Nunito_400Regular",
    ...(Text as any).defaultProps.style,
  };
} else {
  (Text as any).defaultProps = {
    style: {
      fontFamily: "Nunito_400Regular",
    },
  };
}

if ((TextInput as any).defaultProps) {
  (TextInput as any).defaultProps.style = {
    fontFamily: "Nunito_400Regular",
    ...(TextInput as any).defaultProps.style,
  };
} else {
  (TextInput as any).defaultProps = {
    style: {
      fontFamily: "Nunito_400Regular",
    },
  };
}

export const queryClient = new QueryClient();

function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? Colors.dark.bg : "white"}
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? Colors.dark.bg : "white",
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
  const [fontsLoaded] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Geist: require("@/assets/fonts/Geist-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
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
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
