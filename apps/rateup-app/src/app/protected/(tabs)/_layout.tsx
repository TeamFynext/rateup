import { NativeTabs } from "expo-router/unstable-native-tabs";
import "@/config/superTokens";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";
import { useSubscription } from "@/api/sunscription/subscription.query";
import { hasFeature } from "@/utils/subscription";
import { SubscriptionFeaturePathName } from "../../../../enums";

function ProtectedLayout() {
  const colorScheme = useColorScheme();
  const { data: sub, isPending } = useSubscription();

  const hasLoyalty = hasFeature(sub, SubscriptionFeaturePathName.Loyalty);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <NativeTabs
        tintColor={colorScheme === "dark" ? Colors.brand.blueLight : Colors.brand.blue}
        backgroundColor={
          colorScheme === "dark" ? Colors.dark.surface : Colors.light.surface
        }
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

        {!isPending && hasLoyalty && (
          <NativeTabs.Trigger name="loyalty">
            <NativeTabs.Trigger.Icon sf="gift.fill" md="redeem" />
            <NativeTabs.Trigger.Label>Loyalty</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        )}

        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}

export default function LayoutWrapper() {
  return <ProtectedLayout />;
}
