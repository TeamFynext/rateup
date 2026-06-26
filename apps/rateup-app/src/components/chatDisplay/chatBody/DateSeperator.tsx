import { View, Text, useColorScheme } from "react-native";
import React, { memo } from "react";
import { Colors } from "@/constants/colors";

type DateSeparatorProps = {
  label: string;
};

const DateSeparator = ({ label }: DateSeparatorProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View className="flex-row justify-center my-2">
      <View
        style={{
          backgroundColor: isDark
            ? Colors.dark.statusBg
            : Colors.light.systemBg,
          borderRadius: 999,
          paddingVertical: 5,
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Nunito_400Regular",
            color: isDark
              ? Colors.dark.textMuted
              : Colors.light.textSubtle,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
};

export default memo(DateSeparator);
