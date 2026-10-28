import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";
import { getInboxHeaderBg } from "@/constants/inboxDesign";
import { useOrgModules } from "@/hooks/useOrgModules";
import { usePermissions } from "@/hooks/usePermissions";
import { router } from "expo-router";

function ProtectedLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { can } = usePermissions();
  const { isOn } = useOrgModules();

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

        {can("loyalty.cashier") && isOn("loyalty") && (
          <NativeTabs.Trigger name="loyalty">
            <NativeTabs.Trigger.Icon sf="gift.fill" md="redeem" />
            <NativeTabs.Trigger.Label>Loyalty</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        )}

        {/* WA Flow and Web Forms share one tab: Android's bottom bar holds at most five
            items, and a sixth throws. `list.bullet.rectangle.portrait` is iOS 15, under this
            build's 16.4 target, where an unrecognised symbol name draws nothing at all. */}
        <NativeTabs.Trigger name="forms">
          <NativeTabs.Trigger.Icon sf="list.bullet.rectangle.portrait" md="list_alt" />
          <NativeTabs.Trigger.Label>Forms</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="teams">
          <NativeTabs.Trigger.Icon sf="person.2.fill" md="groups" />
          <NativeTabs.Trigger.Label>Teams</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        {/* The last slot is a hub, not a feature: Account, Orders, Calls and anything
            added later live in its menu, so the bar never needs a sixth item. `disabled`
            stops the native tap from switching tabs (it does not grey the item out); the
            tap still reaches `tabPress`, which opens the menu as a native sheet over the current tab. */}
        <NativeTabs.Trigger
          name="more"
          disabled
          listeners={{ tabPress: () => router.push("/protected/more-menu" as never) }}
        >
          {/* `line.3.horizontal` is SF Symbols 2 (iOS 14), inside this build's 16.4 target. */}
          <NativeTabs.Trigger.Icon sf="line.3.horizontal" md="menu" />
          <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}

export default function LayoutWrapper() {
  return <ProtectedLayout />;
}
