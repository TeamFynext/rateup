import { useLifeCyclesQuery } from "@/api/lifecycle/lifecycle.query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LifecycleContext } from "@/context/LifecycleContext";
import { UserProvider } from "@/context/UserContext";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, Platform, useColorScheme, View } from "react-native";
import { useNotificationDeepLink } from "@/utils/useNotificationDeepLink";
import { usePushTokenSync } from "@/utils/usePushTokenSync";
import { useShareIntentRedirect } from "@/utils/useShareIntentRedirect";
import CallScreen from "@/components/calling/CallScreen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProtectedLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Nothing under /protected mounts without a session. Every route here is reachable by a
 * `rateup://` link or a notification tap, and its screens read cached contacts and
 * messages straight off disk, so the check has to happen here rather than on `/`.
 * AuthProvider wipes the local caches when it finds no session.
 */
function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (!isAuthenticated) {
    if (!loading) return <Redirect href="/auth/SignIn" />;
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AuthenticatedLayout />;
}

function AuthenticatedLayout() {
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
    <UserProvider>
      <LifecycleContext value={lifecycles || []}>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          {/* Before the screens: minimised, the call bar takes its own row at the top
              and pushes them down; full size, it is a modal above everything. Either
              way it lives outside the screens, so a call survives navigation. */}
          <CallScreen />
          <Stack screenOptions={{ headerShown: false }}>
            {/* The More tab's menu: a native sheet sized to its rows. On iOS the content
                is clear so the system sheet shows through (Liquid Glass on iOS 26). */}
            <Stack.Screen
              name="more-menu"
              options={{
                presentation: "formSheet",
                sheetAllowedDetents: "fitToContents",
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                contentStyle:
                  Platform.OS === "ios" ? { backgroundColor: "transparent" } : undefined,
              }}
            />
          </Stack>
        </SafeAreaView>
      </LifecycleContext>
    </UserProvider>
  );
}
