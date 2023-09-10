import { useMantineTheme, Group, Avatar, Box, TextInput, Text, Title, Paper, Space, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { PromotionTab } from "../../types/enums";
import ImportRespondents, { ImportRespondentsModal } from "./ImportRespondents";

export function ListItem({ onClick, name, isSelected }) {
  const { colors } = useMantineTheme();
  const bg = isSelected ? "#F0F0F0" : "initial";
  return (
    <Group
      p="xs"
      sx={{
        cursor: "pointer",
        backgroundColor: bg
      }}
      onClick={onClick}
    >
      <Avatar size={"lg"} radius={"xl"} />
      <Text>{name}</Text>
    </Group>
  )
}

export function LeftPanel({ items, activeTab, setActiveTab, importModalIsOpen,openImport, closeImport, selected, setSelected, ...props }) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchResults = searchTerm === "" ? items : items?.filter(({ name }) => name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <Paper
      sx={{
        flex: 2, borderRadius: "8px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        ...props.sx
      }}
    >
      <PromotionHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <SearchBar
        placeholder={"Search"}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <Space h={"md"} />
      {props.children}
      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        {searchResults && searchResults.map(({ name, id }) => (
          <ListItem name={name} isSelected={id === selected} key={id} onClick={() => setSelected(id)} />
        ))}
      </Box>
      <ImportRespondents onClick={openImport} />
      <ImportRespondentsModal opened={importModalIsOpen} close={closeImport} createGroup={activeTab === PromotionTab.Groups} />
    </Paper>
  )
}

function PromotionHeader({ activeTab, setActiveTab }) {
  const theme = useMantineTheme()

  return <Box
    sx={{
      borderRadius: "8px",
      background: "linear-gradient(271deg, #3F5BA9 -6.39%, #49C8E9 204.31%);",
      boxShadow: "2px 4px 7px 0px rgba(0, 0, 0, 0.06);"
    }}
    p="lg"
  >
    <Group position="apart">
      <Title sx={{
        color: "white",
      }}
        order={2}
      >
        Promotion
      </Title>
      <Group position="center">
        <TabSwitchButton activeTab={activeTab} setActiveTab={setActiveTab} tabName={PromotionTab.Groups} />
        <TabSwitchButton activeTab={activeTab} setActiveTab={setActiveTab} tabName={PromotionTab.Individuals} />
      </Group>
    </Group>
  </Box>;
}

function TabSwitchButton({ activeTab, setActiveTab, tabName }) {
  const selected = activeTab === tabName;
  return (
    <UnstyledButton
      py="xs"
      px="xl"
      onClick={() => setActiveTab(tabName)}
      sx={{
        borderRadius: "100px",
        border: "2px solid white",
        borderColor: "white",
        backgroundColor: selected ? "white" : "transparent",
        color: selected ? "#3F5BA9" : "white",
        '&:hover': {
          backgroundColor: "white !important",
          color: "#3F5BA9 !important",
        }
      }}
    >
      {tabName}
    </UnstyledButton>

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