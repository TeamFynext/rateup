import React from "react";
import { Pressable, Text, View } from "react-native";

import { FONT, useTheme } from "@/components/loyalty/cashier/ui";

/** A two-to-four-way switch on the header bar: a `surface2` track with the chosen option raised. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  inset = 16,
}: Readonly<{
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Side gutter; 16 lines it up with a header bar, 0 when it sits inside a card. */
  inset?: number;
}>) {
  const { t } = useTheme();
  return (
    <View style={{ paddingHorizontal: inset }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          padding: 3,
          gap: 3,
          borderRadius: 12,
          backgroundColor: t.surface2,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: selected ? t.surface : "transparent",
                borderWidth: selected ? 1 : 0,
                borderColor: t.border1,
              }}
            >
              <Text
                style={{
                  fontFamily: selected ? FONT.semibold : FONT.medium,
                  fontSize: 14,
                  color: selected ? t.fg1 : t.fg3,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
