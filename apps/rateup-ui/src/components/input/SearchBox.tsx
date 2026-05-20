// create a text input with a search icon using mantine ui

import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export default function SearchBox({
  searchText,
  setSearchText,
  placeholder = "Search",
  sx = {},
}) {
  return (
    <TextInput
      placeholder={placeholder}
      style={sx}
      value={searchText}
      onChange={(e) => setSearchText(e.currentTarget.value)}
      leftSection={<IconSearch stroke={1.5} size={"1rem"} />}
      radius="xl"
      size="md"
      w={"40vw"}
      rightSectionWidth={42}
    />
  );
}
