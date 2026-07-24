import React from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { getInboxHeaderBg, getInboxRowTheme } from "@/constants/inboxDesign";

/**
 * The design's screen header (`RateUp Mobile Inbox.dc.html`): a `--bg-surface`
 * bar at `padding: 6px 16px 12px`, a 20px/800 wordmark, and 38x38 radius-11
 * actions. `below` takes anything that hangs off the same bar, like the inbox's
 * segment strip, which the design places 12px under the title row.
 */
export default function ScreenHeader({
  title,
  actions,
  below,
}: Readonly<{
  title: string;
  actions?: React.ReactNode;
  below?: React.ReactNode;
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: "Nunito_800ExtraBold",
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
              fontFamily: "Nunito_800ExtraBold",
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
