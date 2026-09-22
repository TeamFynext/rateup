import { View } from "react-native";
import { useSearchFlowStore } from "@/utils/store";
import SearchField from "@/components/common/SearchField";

/** Sits under the Flow header, on the same bar. Filtering lives in the header. */
const FlowSearchBar = () => {
  const { search, setSearch } = useSearchFlowStore();

  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16 }}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search flows" />
    </View>
  );
};

export default FlowSearchBar;
