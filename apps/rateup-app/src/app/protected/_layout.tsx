import { useLifeCyclesQuery } from "@/api/lifecycle/lifecycle.query";
import { AuthProvider } from "@/context/AuthContext";
import { LifecycleContext } from "@/context/LifecycleContext";
import { UserProvider } from "@/context/UserContext";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProtectedLayout() {
  const colorScheme = useColorScheme();
  const { data: lifecycles } = useLifeCyclesQuery();
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
