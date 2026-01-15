import { View, TextInput, Pressable, useColorScheme } from "react-native";
import { SearchIcon } from "@/src/constants/imageExports";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "white" : colors["slate-950"];
  return (
    <View className="flex-1">
      {/* Search Input */}
      <View className="flex-row items-center border border-lightgray dark:border-gray-900 bg-white dark:bg-gray-900 rounded-full px-4 py-2">
        {searchTerm ? (
          <Pressable onPress={() => setSearchTerm("")}>
            <IconArrowLeft height={20} width={20} color={textColor} />
          </Pressable>
        ) : (
          <SearchIcon width={20} height={20} />
        )}
        <TextInput
          placeholder="Search Contacts"
          placeholderTextColor="#E2E5ED"
          className="flex-1 ml-2 text-sm dark:text-white"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
    </View>
  );
}
