import { NativeTabs } from "expo-router/unstable-native-tabs";
import "@/config/superTokens";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";
import { getInboxHeaderBg } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";

function ProtectedLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { can } = usePermissions();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <NativeTabs
        tintColor={isDark ? Colors.brand.blueLight : Colors.brand.blue}
        // Same `--bg-surface` the inbox header sits on, so the top and bottom
        // chrome read as one surface.
        backgroundColor={getInboxHeaderBg(isDark)}
        indicatorColor={"transparent"}
      >
        <NativeTabs.Trigger name="inbox">
          <NativeTabs.Trigger.Icon sf="tray.fill" md="inbox" />
          <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        {can("loyalty.cashier") && (
          <NativeTabs.Trigger name="loyalty">
            <NativeTabs.Trigger.Icon sf="gift.fill" md="redeem" />
            <NativeTabs.Trigger.Label>Loyalty</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        )}

        {/* A form, which is literally what a WhatsApp Flow is: fields the customer fills
            in without leaving the chat. `list.bullet.rectangle.portrait` is iOS 15, under
            this build's 16.4 target (ios/Podfile), where an unrecognised symbol name draws
            nothing at all. */}
        <NativeTabs.Trigger name="flows">
          <NativeTabs.Trigger.Icon sf="list.bullet.rectangle.portrait" md="list_alt" />
          <NativeTabs.Trigger.Label>WA Flow</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        {/* Was a 2x2 grid, which reads as a dashboard rather than something anyone fills
            in. `checklist` exists under the same name on both platforms. */}
        <NativeTabs.Trigger name="webForms">
          <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
          <NativeTabs.Trigger.Label>Web Forms</NativeTabs.Trigger.Label>
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
  return <ProtectedLayout />;
}
