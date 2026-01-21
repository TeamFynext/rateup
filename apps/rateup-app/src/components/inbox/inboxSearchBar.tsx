import {
  View,
  TextInput,
  Pressable,
  useColorScheme,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react-native";
import { IconArrowLeft } from "@tabler/icons-react-native";
import { colors } from "@/src/constants/constants";

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
  const textColor = isDark ? "white" : colors["slate-950"];
  const bgColor = isDark ? "#0f172a" : "#f8fafc";

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const closeSearch = () => {
    setOpen(false);
  };

  return (
    <View className="relative">
      {/* SEARCH ICON */}
      <Pressable onPress={() => setOpen(true)} hitSlop={10}>
        <Search size={20} color={"white"} />
      </Pressable>

      {/* BACKDROP (click outside) */}
      {open && (
        <Pressable
          onPress={closeSearch}
          style={{
            position: "absolute",
            top: -1000,
            bottom: -1000,
            left: -1000,
            right: -1000,
            zIndex: 40,
          }}
        />
      )}

      {/* FLOATING SEARCH MODAL */}
      {open && (
        <View className="absolute top-10 right-0 z-50 w-72">
          <View
            className="flex-row items-center gap-2 rounded-xl px-3 py-2 shadow-lg"
            style={{ backgroundColor: bgColor }}
          >
            <Pressable onPress={closeSearch} hitSlop={10}>
              <IconArrowLeft size={20} color={textColor} />
            </Pressable>

            <TextInput
              ref={inputRef}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search…"
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              className="flex-1 text-base"
              style={{ color: textColor }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      )}
    </View>
  );
}
