import { NativeTabs } from "expo-router/unstable-native-tabs";
import { AuthProvider } from "@/context/AuthContext";
import "@/config/superTokens";
import { useFonts } from "expo-font";
import { UserProvider } from "@/context/UserContext";
import { useLifeCyclesQuery } from "@/api/lifecycle/lifecycle.query";
import { LifecycleContext } from "@/context/LifecycleContext";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme, View } from "react-native";
import { colors } from "@/constants/constants";
import { SafeAreaView } from "react-native-safe-area-context";

function ProtectedLayout() {
  const colorScheme = useColorScheme();
  useFonts({
    Geist: require("@/assets/fonts/Geist-Regular.ttf"),
  });

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <NativeTabs
        tintColor={colors["primary-blue"]}
        backgroundColor={colorScheme === "dark" ? colors["slate-950"] : colors["gray-50"] }
        indicatorColor={"transparent"}
      >
        <NativeTabs.Trigger name="inbox">
          <NativeTabs.Trigger.Icon sf="tray.fill" md="inbox" />
          <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="flows">
          <NativeTabs.Trigger.Icon sf="bolt.fill" md="bolt" />
          <NativeTabs.Trigger.Label>Flow</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="webForms">
          <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="dashboard" />
          <NativeTabs.Trigger.Label>Web Forms</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="loyalty">
          <NativeTabs.Trigger.Icon sf="gift.fill" md="redeem" />
          <NativeTabs.Trigger.Label>Loyalty</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}

export default function LayoutWrapper() {
  const { data: lifecycles } = useLifeCyclesQuery();
  return (
    <AuthProvider>
      <UserProvider>
        <LifecycleContext value={lifecycles || []}>
          <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            <ProtectedLayout />
          </SafeAreaView>
        </LifecycleContext>
      </UserProvider>
    </AuthProvider>
  );
}
