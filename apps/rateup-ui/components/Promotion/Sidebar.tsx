import { useMantineTheme, Group, Avatar, Box, Divider, TextInput, Text, Title, Button } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { PromotionTab } from "../../types/enums";

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

export function SideBar({ items, selected, setSelected, activeTab, setActiveTab, ...props }) {
  const { colors } = useMantineTheme()
  const [searchTerm, setSearchTerm] = useState("");
  const searchResults = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(({ name }) => name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [searchTerm, items])

  return (
    <Box sx={{ flex: 2, backgroundColor: colors.gray[1], borderRadius: "8px", position: "relative", display: "flex", flexDirection: "column" }}>
      <PromotionHeader activeTab={activeTab} setActiveTab={setActiveTab} />
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

function PromotionHeader({ activeTab, setActiveTab }) {
  const { colors } = useMantineTheme()

  return <Box sx={{ backgroundColor: colors.blue[5], borderTopLeftRadius: "8px" }} p="lg">
    <Group position="apart">
      <Title sx={{
        color: "white",
      }}
        order={2}
      >
        Promotion
      </Title>
      <Group position="apart">
        <TabSwitchButton activeTab={activeTab} setActiveTab={setActiveTab} tabName={PromotionTab.Groups} />
        <TabSwitchButton activeTab={activeTab} setActiveTab={setActiveTab} tabName={PromotionTab.Individuals} />
      </Group>
    </Group>
  </Box>;
}

function TabSwitchButton({ activeTab, setActiveTab, tabName }) {
  return (
    <Button
      // TODO: change to white

      color="dark"
      variant={activeTab === tabName ? "filled" : "outline"}
      onClick={() => setActiveTab(tabName)}
      sx={{
        borderRadius: "100px",
        scale: ".9",
        fontSize: ".9rem",
      }}
    >
      {tabName}
    </Button>

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