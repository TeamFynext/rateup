import { View, Text, useColorScheme } from "react-native";
import React, { memo } from "react";
import { getInboxRowTheme } from "@/constants/inboxDesign";

type DateSeparatorProps = {
  label: string;
};

/** The design's day chip: `--bg-surface-2`, 4px/12px, 11px in `--fg-3`. */
const DateSeparator = ({ label }: DateSeparatorProps) => {
  const colorScheme = useColorScheme();
  const t = getInboxRowTheme(colorScheme === "dark");
  return (
    <View className="flex-row justify-center my-2">
      <View
        style={{
          backgroundColor: t.surface2,
          borderRadius: 9999,
          paddingVertical: 4,
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontFamily: "InstrumentSans_400Regular",
            color: t.fg3,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
};

export default memo(DateSeparator);
