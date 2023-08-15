import { useMantineTheme, Group, Avatar, Box, Divider, TextInput, Text } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, useMemo } from "react";

export function ListItem({ onClick, name, isSelected }) {
  const { colors } = useMantineTheme();
  const bg = isSelected ? colors.dark[7] : "initial";
  return (
    <Group p="xs" sx={{
      borderBottom: "solid grey 1px", cursor: "pointer",
      color: isSelected ? "white" : "black",
      backgroundColor: bg
    }} onClick={onClick}>
      <Avatar size={"lg"} radius={"xl"} />
      <Text>{name}</Text>
    </Group>
  )
}

export function SideBar({ items, selected, setSelected, ...props }) {
  const { colors } = useMantineTheme()
  const [searchTerm, setSearchTerm] = useState("");
  const searchResults = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(({ name }) => name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [searchTerm, items])

  return (
    <Box sx={{ flex: 1, backgroundColor: colors.gray[1], borderRadius: "8px", position: "relative", display: "flex", flexDirection: "column" }}>
      <SearchBar placeholder={"Search"} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <Divider />
      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        {searchResults.map(({ name, id }) => (
          <ListItem name={name} isSelected={id === selected} key={id} onClick={() => setSelected(id)} />
        ))}
      </Box>
      {props.children}
    </Box>
  )
}

function SearchBar({ placeholder, searchTerm, setSearchTerm }) {
  const theme = useMantineTheme();

  return (
    <TextInput
      m={"sm"}
      icon={<IconSearch size="1.1rem" stroke={1.5} />}
      radius="xl"
      size="md"
      placeholder={placeholder}
      rightSectionWidth={42}
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.currentTarget.value)}
    />
  );
}