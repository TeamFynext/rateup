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
import { Colors } from "@/constants/colors";
import { NoticeHost } from "@/components/common/Notice";
import {
  Figtree_300Light,
  Figtree_800ExtraBold,
  Figtree_900Black,
} from "@expo-google-fonts/figtree";
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from "@expo-google-fonts/instrument-sans";
import "../global.css";

// Monkey-patch Text and TextInput components to use InstrumentSans_400Regular as the global default font
if ((Text as any).defaultProps) {
  (Text as any).defaultProps.style = {
    fontFamily: "InstrumentSans_400Regular",
    ...(Text as any).defaultProps.style,
  };
} else {
  (Text as any).defaultProps = {
    style: {
      fontFamily: "InstrumentSans_400Regular",
    },
  };
}

if ((TextInput as any).defaultProps) {
  (TextInput as any).defaultProps.style = {
    fontFamily: "InstrumentSans_400Regular",
    ...(TextInput as any).defaultProps.style,
  };
} else {
  (TextInput as any).defaultProps = {
    style: {
      fontFamily: "InstrumentSans_400Regular",
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
  // Design System V2's split, the same one `rateup-ui/src/styles/foundation.css` sets:
  // Instrument Sans carries body and UI, Figtree the display sizes. Instrument Sans stops
  // at 700, which is why the two heaviest faces and the 300 label weight are Figtree's.
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    Figtree_300Light,
    Figtree_800ExtraBold,
    Figtree_900Black,
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
