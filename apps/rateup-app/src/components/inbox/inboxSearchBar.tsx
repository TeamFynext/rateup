import {
  View,
  TextInput,
  Pressable,
  useColorScheme,
} from "react-native";
import { useRef, useState } from "react";
import { Search, X } from "lucide-react-native";
import { Colors } from "@/constants/colors";

type SearchBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

export default function SearchBar({
  searchTerm,
  setSearchTerm,
}: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const bgColor = isDark ? Colors.dark.surface : Colors.light.inputBg;
  const iconColor = isDark
    ? "rgba(255,255,255,0.85)"
    : "rgba(255,255,255,0.88)";

  return (
    <View className="relative">
      {/* SEARCH ICON */}
      <Pressable onPress={() => setOpen(true)}>
        <View className="p-1">
          <Search size={20} color={iconColor} />
        </View>
      </Pressable>

      {/* FLOATING SEARCH MODAL */}
      {open && (
        <View className="absolute -top-5 right-8 z-50 w-72">
          <View
            className="flex-row items-center gap-2 rounded-xl px-3 py-2 shadow-lg"
            style={{ backgroundColor: bgColor }}
          >
            <TextInput
              ref={inputRef}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search…"
              placeholderTextColor={isDark ? Colors.dark.textPlaceholder : Colors.light.textPlaceholder}
              className="flex-1 text-base"
              style={{ color: textColor }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <Pressable onPress={() => {
              setSearchTerm("")
              setOpen(false)
            }}>
              <View className="p-2 -mr-2">
                <X size={20} color={textColor} />
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
