import React from "react";
import { Text, View } from "react-native";

import { Skeleton } from "@/components/common/Skeleton";
import { FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";

/** The web's analytics `Card`: a titled section with a one-line description. */
export function SectionCard({
  title,
  description,
  right,
  children,
}: Readonly<{
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border1,
        padding: 16,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: t.fg1 }}>{title}</Text>
          {description ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
              {description}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** A headline number with its label above it; the value never wears a series colour. */
export function StatTile({
  label,
  value,
  icon,
  minWidth = "45%",
}: Readonly<{
  label: string;
  value: string;
  icon?: React.ReactNode;
  /** "45%" gives two tiles a row; "30%" fits three. */
  minWidth?: `${number}%`;
}>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth,
        backgroundColor: t.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: FONT.medium,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: t.fg3,
          }}
        >
          {label}
        </Text>
        {icon}
      </View>
      <Text style={{ fontFamily: FONT.semibold, fontSize: 22, color: t.fg1, ...NUM }}>{value}</Text>
    </View>
  );
}

/** The web's `DotBadge`: a neutral pill whose dot carries the judgement. */
export function DotBadge({ label, color }: Readonly<{ label: string; color: string }>) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "center",
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.border1,
        backgroundColor: t.surface,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: color }} />
      <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.fg1 }}>{label}</Text>
    </View>
  );
}

/** A square swatch and a label, for chart legends and NPS breakdowns. */
export function Swatch({ color, label }: Readonly<{ color: string; label: string }>) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>{label}</Text>
    </View>
  );
}

export function CardSkeleton({ height = 220 }: Readonly<{ height?: number }>) {
  return <Skeleton height={height} borderRadius={14} />;
}

export const plural = (count: number, one: string, other = `${one}s`) =>
  `${count} ${count === 1 ? one : other}`;
