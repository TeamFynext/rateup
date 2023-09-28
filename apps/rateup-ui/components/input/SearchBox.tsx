// create a text input with a search icon using mantine ui


import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";

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
      leftSection={<IconSearch />}
    />
  )
}