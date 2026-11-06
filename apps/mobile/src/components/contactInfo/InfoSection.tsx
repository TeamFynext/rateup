import React from "react";
import { Text, View, useColorScheme } from "react-native";

import Tap from "@/components/common/Tap";
import { getInboxRowTheme } from "@/constants/inboxDesign";

/** A titled card on the Contact info screen, with an optional action beside the title. */
export function Section({
  label,
  action,
  children,
}: Readonly<{
  label: string;
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
  children: React.ReactNode;
}>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <View style={{ marginTop: 22 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          marginHorizontal: 4,
          minHeight: 18,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontFamily: "InstrumentSans_700Bold",
            color: t.fg4,
            letterSpacing: 0.8,
          }}
        >
          {label.toUpperCase()}
        </Text>
        {action ? (
          <Tap
            onPress={action.onPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            pressedStyle={{ opacity: 0.6 }}
          >
            <Text
              style={{ fontSize: 13, fontFamily: "InstrumentSans_600SemiBold", color: t.brand }}
            >
              {action.label}
            </Text>
          </Tap>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: t.surface2,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border1,
          paddingHorizontal: 14,
          paddingVertical: 4,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function InfoRow({
  label,
  value,
  icon,
  action,
  last,
  multiline,
}: Readonly<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  last?: boolean;
  /** Let a long value (notes, an address) wrap instead of cutting it to one line. */
  multiline?: boolean;
}>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: multiline ? "flex-start" : "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.rowDivider,
      }}
    >
      {icon ? (
        <View style={{ width: 18, alignItems: "center", marginTop: multiline ? 2 : 0 }}>
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, fontFamily: "InstrumentSans_400Regular", color: t.fg4 }}>
          {label}
        </Text>
        {typeof value === "string" ? (
          <Text
            numberOfLines={multiline ? undefined : 1}
            selectable
            style={{
              fontSize: 14,
              lineHeight: multiline ? 20 : undefined,
              fontFamily: "InstrumentSans_600SemiBold",
              color: t.fg1,
              marginTop: 2,
            }}
          >
            {value || "—"}
          </Text>
        ) : (
          <View style={{ marginTop: 2 }}>{value}</View>
        )}
      </View>
      {action}
    </View>
  );
}

/** A quiet one-line note inside a section: an empty state or a load failure. */
export function SectionNote({ text }: Readonly<{ text: string }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <Text
      style={{
        fontSize: 13,
        fontFamily: "InstrumentSans_400Regular",
        color: t.fg3,
        paddingVertical: 14,
      }}
    >
      {text}
    </Text>
  );
}

/** A small rounded tag: labels, audiences, the "Main" marker. */
export function Pill({
  text,
  tone = "neutral",
}: Readonly<{ text: string; tone?: "neutral" | "brand" }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const brand = tone === "brand";
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: brand ? t.brandSoft : t.pageBg,
        borderWidth: brand ? 0 : 1,
        borderColor: t.border1,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 12,
          fontFamily: "InstrumentSans_600SemiBold",
          color: brand ? t.brand : t.fg2,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
