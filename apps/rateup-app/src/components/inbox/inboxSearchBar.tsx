import { View, TextInput, Pressable, TouchableOpacity } from "react-native"
import { AddContactIcon, FilterIcon, RefreshIcon, SearchIcon, BackIcon } from "@/src/constants/imageExports"
import { useRouter } from "expo-router";

type SearchBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

export default function SearchBar({searchTerm,setSearchTerm}:SearchBarProps) {
  const router = useRouter()
  return (
    <View className="bg-[#EBF7F5] h-[9vh] flex-row justify-around items-center mb-[-21] px-4">
    <View className="bg-[#FFFFFF] rounded-full px-4 py-2 mb-2 border border-[#E2E5ED] flex-row gap-1 items-center w-[60vw]">
      {
        searchTerm?(
          <Pressable
          onPress={()=>setSearchTerm("")}>
            <BackIcon/>
          </Pressable>
        ):(
          <SearchIcon/>
        )
      }
      
      <TextInput
        placeholder="Search Contacts"
        placeholderTextColor="#E2E5ED"
        className="w-full"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
    </View>
    {/* add contacts */}
    <View className="flex-row gap-4">

      <TouchableOpacity
      onPress={()=>router.push("/inbox/addContact")}>
      <AddContactIcon/>
      </TouchableOpacity>

      <TouchableOpacity
      onPress={()=>router.push("/inbox/filters")}>
      <FilterIcon/>
      </TouchableOpacity>

      <TouchableOpacity>
      <RefreshIcon/>
      </TouchableOpacity>
    </View>
    </View>
  )
}