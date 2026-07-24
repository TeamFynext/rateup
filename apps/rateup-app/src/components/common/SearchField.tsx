import React from "react";
import { TextInput, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Search } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";

/**
 * The design's search field (`RateUp Mobile Inbox.dc.html`, the `viewSearch`
 * block): 40px tall, radius 11, filled with `--bg-surface-2`, a 17px glyph in
 * `--fg-4` and a 14px input.
 */
export default function SearchField({
  value,
  onChangeText,
  placeholder,
}: Readonly<{
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}>) {
  const { colorScheme } = useColorScheme();
  const t = getInboxRowTheme(colorScheme === "dark");

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 11,
        backgroundColor: t.surface2,
      }}
    >
      <Search size={17} color={t.fg4} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.fg4}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{
          flex: 1,
          fontSize: 14,
          fontFamily: "Nunito_400Regular",
          color: t.fg1,
          padding: 0,
        }}
      />
    </View>
  );
}
