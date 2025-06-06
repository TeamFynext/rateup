import { View, TextInput, Pressable } from "react-native";
import { SearchIcon, BackIcon } from "@/src/constants/imageExports";

type SearchBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

export default function SearchBar({
  searchTerm,
  setSearchTerm,
}: SearchBarProps) {
  return (
    <View className="flex-1 bg-rateUpLightGreen">
        {/* Search Input */}
        <View className="flex-row items-center border border-[#E2E5ED] bg-white rounded-full px-4 py-2">
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm("")}>
              <BackIcon width={20} height={20} />
            </Pressable>
          ) : (
            <SearchIcon width={20} height={20} />
          )}

          <TextInput
            placeholder="Search Contacts"
            placeholderTextColor="#E2E5ED"
            className="flex-1 ml-2 text-sm"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>
  );
}
