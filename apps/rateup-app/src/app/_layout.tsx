import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/config/queryClient";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Stack } from "expo-router";
import { StatusBar, Text, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { getThemePreference } from "@/utils/theme";
// Imported for its module-scope `setNotificationHandler` as much as for the
// channel helper: the handler has to be registered before the first notification
// arrives, and this is the earliest module the app loads.
import { setupAndroidNotificationChannel } from "@/utils/notification";
import { configurePlaybackAudioMode } from "@/utils/audio";
import { Colors } from "@/constants/colors";
import { NoticeHost } from "@/components/common/Notice";
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

export { queryClient };

function RootLayout() {
  const { colorScheme } = useColorScheme();
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
  const { setColorScheme } = useColorScheme();
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

  useEffect(() => {
    async function initTheme() {
      const savedTheme = await getThemePreference();
      setColorScheme(savedTheme);
    }
    initTheme();
  }, [setColorScheme]);

  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  // Without this the app runs on iOS's default `.soloAmbient` session, so voice
  // notes and video are muted by the hardware Ring/Silent switch.
  useEffect(() => {
    configurePlaybackAudioMode();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <RootLayout />
          {/* Sibling of the navigator so notices sit above every screen, and
              box-none inside so it never intercepts a touch. */}
          <NoticeHost />
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
