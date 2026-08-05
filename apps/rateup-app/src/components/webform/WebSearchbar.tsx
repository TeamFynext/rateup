import { View } from "react-native";
import { useSearchWebFormStore } from "@/utils/store";
import SearchField from "@/components/common/SearchField";

/** Sits under the Web Forms header, on the same bar. Filtering lives in the header. */
const WebFormSearchBar = () => {
  const { search, setSearch } = useSearchWebFormStore();

  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16 }}>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search web forms"
      />
    </View>
  );
};

export default WebFormSearchBar;
