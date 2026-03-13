import {
  View,
  TextInput,
  Pressable,
  useColorScheme,
} from "react-native";
import { useRef, useState } from "react";
import { Search, X } from "lucide-react-native";
import { colors } from "@/constants/constants";

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

  return (
    <View className="relative">
      {/* SEARCH ICON */}
      <Pressable onPress={() => setOpen(true)} hitSlop={10}>
        <Search size={20} color={"white"} />
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
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              className="flex-1 text-base"
              style={{ color: textColor }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <Pressable onPress={()=>{
              setSearchTerm("")
              setOpen(false)
            }} hitSlop={10}>
              <X size={20} color={textColor} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
