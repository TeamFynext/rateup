import { NativeTabs } from "expo-router/native-tabs";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";
import { getInboxHeaderBg, getInboxRowTheme, tint } from "@/constants/inboxDesign";
import { Platform } from "react-native";
import { useOrgModules } from "@/hooks/useOrgModules";
import { usePermissions } from "@/hooks/usePermissions";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IonName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Android tab icons come from Ionicons, the same set the More menu sheet uses, so the
 * bar and the sheet share one icon style (rounded, filled like SF Symbols on iOS).
 * Outline when idle, filled when selected. iOS keeps its SF Symbols via `sf`.
 */
const androidIcon = (name: IonName, outline: IonName) =>
  Platform.OS === "android"
    ? {
        src: {
          default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={outline} />,
          selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={name} />,
        },
      }
    : {};

function ProtectedLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { can } = usePermissions();
  const { isOn } = useOrgModules();
  const t = getInboxRowTheme(isDark);

  // Android only, so the iOS bar stays as it is. Material hides every label but the
  // selected one once there are more than three tabs, and a transparent indicator left
  // the selected tab without a shape. Always-on labels plus a soft brand pill (the same
  // fill as the "Open" chip and the menu sheet's tiles) make the bar match the sheet.
  const androidBarProps =
    Platform.OS === "android"
      ? {
          labelVisibilityMode: "labeled" as const,
          indicatorColor: tint(t.brand, isDark ? 0.24 : 0.14, t.brandSoft),
          rippleColor: tint(t.brand, 0.12, t.brandSoft),
          iconColor: { default: t.fg3, selected: t.brand },
          labelStyle: {
            default: { color: t.fg3, fontSize: 12, fontWeight: "500" as const },
            selected: { color: t.brand, fontSize: 12, fontWeight: "700" as const },
          },
        }
      : {};

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <NativeTabs
        tintColor={isDark ? Colors.brand.blueLight : Colors.brand.blue}
        // Same `--bg-surface` the inbox header sits on, so the top and bottom
        // chrome read as one surface.
        backgroundColor={getInboxHeaderBg(isDark)}
        {...androidBarProps}
      >
        <NativeTabs.Trigger name="inbox">
          <NativeTabs.Trigger.Icon
            sf="tray.fill"
            {...androidIcon("file-tray", "file-tray-outline")}
          />
          <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        {can("loyalty.cashier") && isOn("loyalty") && (
          <NativeTabs.Trigger name="loyalty">
            <NativeTabs.Trigger.Icon sf="gift.fill" {...androidIcon("gift", "gift-outline")} />
            <NativeTabs.Trigger.Label>Loyalty</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        )}

        {/* WhatsApp Flows and Surveys share one tab: Android's bottom bar holds at most five
            items, and a sixth throws. `list.bullet.rectangle.portrait` is iOS 15, under this
            build's 16.4 target, where an unrecognised symbol name draws nothing at all. */}
        <NativeTabs.Trigger name="forms">
          <NativeTabs.Trigger.Icon
            sf="list.bullet.rectangle.portrait"
            {...androidIcon("reader", "reader-outline")}
          />
          <NativeTabs.Trigger.Label>Responses</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="teams">
          <NativeTabs.Trigger.Icon
            sf="person.2.fill"
            {...androidIcon("people", "people-outline")}
          />
          <NativeTabs.Trigger.Label>Teams</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        {/* The last slot is a hub, not a feature: Profile, Orders, Calls and anything
            added later live in its menu, so the bar never needs a sixth item. `disabled`
            stops the native tap from switching tabs (it does not grey the item out); the
            tap still reaches `tabPress`, which opens the menu as a native sheet over the current tab. */}
        <NativeTabs.Trigger
          name="more"
          disabled
          // Tapping Menu while already on it opens the sheet; without this the system
          // also popped the tab's stack back to its first screen (often Profile).
          disablePopToTop
          listeners={{ tabPress: () => router.push("/protected/more-menu" as never) }}
        >
          {/* `line.3.horizontal` is SF Symbols 2 (iOS 14), inside this build's 16.4 target. */}
          <NativeTabs.Trigger.Icon
            sf="line.3.horizontal"
            {...androidIcon("menu", "menu-outline")}
          />
          <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}

export default function LayoutWrapper() {
  return <ProtectedLayout />;
}
