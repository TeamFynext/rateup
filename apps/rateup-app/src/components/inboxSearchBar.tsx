import { View, TextInput, Pressable } from "react-native"
import { AddContactIcon, FilterIcon, RefreshIcon, SearchIcon } from "../constants/imageExports";

export default function SearchBar() {
  return (
    <View className="bg-[#EBF7F5] h-[9vh] flex-row justify-around items-center mb-[-21]">
    <View className="bg-[#FFFFFF] rounded-full px-4 py-2 mb-2 border border-[#E2E5ED] flex-row gap-1 items-center w-[60vw]">
        <SearchIcon />
      <TextInput
        placeholder="Search Contacts"
        placeholderTextColor="#E2E5ED"
        className="w-full"
      />
    </View>
    <View className="flex-row gap-4">
      <Pressable>
      <AddContactIcon/>
      </Pressable>

      <Pressable>
      <FilterIcon/>
      </Pressable>

      <Pressable
      >
      <RefreshIcon/>
      </Pressable>
    </View>
    </View>
  )
}