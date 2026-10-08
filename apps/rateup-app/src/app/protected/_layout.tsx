import { useLifeCyclesQuery } from "@/api/lifecycle/lifecycle.query";
import { AuthProvider } from "@/context/AuthContext";
import { LifecycleContext } from "@/context/LifecycleContext";
import { UserProvider } from "@/context/UserContext";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { useNotificationDeepLink } from "@/utils/useNotificationDeepLink";
import { usePushTokenSync } from "@/utils/usePushTokenSync";
import { useShareIntentRedirect } from "@/utils/useShareIntentRedirect";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProtectedLayout() {
  const colorScheme = useColorScheme();
  const { data: lifecycles } = useLifeCyclesQuery();
  // Here rather than in the root layout: a notification tap must not route an
  // unauthenticated user into a chat.
  useNotificationDeepLink();
  // Re-registers the device token on every foreground, so a rotated token is
  // not left stale for the life of the session.
  usePushTokenSync();
  // Here for the same reason as the notification deep link: something shared in while
  // signed out waits until sign-in instead of opening a chat list.
  useShareIntentRedirect();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <UserProvider>
          <LifecycleContext value={lifecycles || []}>
            <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaView>
          </LifecycleContext>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
