import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { getInboxHeaderBg, getInboxRowTheme } from "@/constants/inboxDesign";

/**
 * The design's screen header (`RateUp Mobile Inbox.dc.html`): a `--bg-surface`
 * bar at `padding: 6px 16px 12px`, a 20px/800 wordmark, and 38x38 radius-11
 * actions. `below` takes anything that hangs off the same bar, like the inbox's
 * segment strip, which the design places 12px under the title row.
 *
 * `onBack` puts the way out in the bar itself rather than in the screen's content, so it
 * is still there at the bottom of a long form — and so a screen with no form of its own
 * has one at all.
 */
export default function ScreenHeader({
  title,
  actions,
  below,
  onBack,
}: Readonly<{
  title: string;
  actions?: React.ReactNode;
  below?: React.ReactNode;
  onBack?: () => void;
}>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);

  return (
    <View
      style={{
        backgroundColor: getInboxHeaderBg(isDark),
        paddingTop: 6,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: t.border1,
      }}
    >
      {/* 38 is the height of a back button and of `HeaderIconButton`, and without it
          the row is only as tall as the 20px title — so a screen carrying neither (the
          cashier's first step) drew a shorter bar with its title a few pixels higher
          than the tab beside it. Pinned, every screen's title lands on one line. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 38,
          paddingHorizontal: 16,
        }}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{
              width: 38,
              height: 38,
              marginLeft: -9,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={22} color={t.fg1} />
          </Pressable>
        ) : null}

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: "Figtree_800ExtraBold",
            fontSize: 20,
            color: t.fg1,
          }}
        >
          {title}
        </Text>
        {actions}
      </View>

      {below ? <View style={{ marginTop: 12 }}>{below}</View> : null}
    </View>
  );
}

/**
 * A header action: 38x38 at radius 11 with a 20px glyph in `--fg-2`. `badge`
 * renders the design's bell dot — `--danger` with a 2px bar-coloured ring.
 */
export function HeaderIconButton({
  onPress,
  badge,
  children,
}: Readonly<{
  onPress: () => void;
  badge?: number;
  children: React.ReactNode;
}>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <View
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 15,
            height: 15,
            paddingHorizontal: 3,
            borderRadius: 9999,
            backgroundColor: t.danger,
            borderWidth: 2,
            borderColor: getInboxHeaderBg(isDark),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 8,
              fontFamily: "Figtree_800ExtraBold",
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
