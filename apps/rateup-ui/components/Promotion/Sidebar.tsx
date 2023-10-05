import {
  useMantineTheme,
  Group,
  Avatar,
  Box,
  TextInput,
  Text,
  Title,
  Paper,
  Space,
  UnstyledButton,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { PromotionTab } from "../../types/enums";
import classes from "./Sidebar.module.css";
import ImportWaCustomers, { ImportWaCustomersModal } from "./ImportWaCustomers";

// Individual list item of chat (group or individual)
export function ListItem({ onClick, name, isSelected }) {
  const { colors } = useMantineTheme();
  const bg = isSelected ? "#F0F0F0" : "initial";
  return (
    <Group
      p="xs"
      style={{
        cursor: "pointer",
        backgroundColor: bg,
      }}
      onClick={onClick}
    >
      <Avatar size={"lg"} radius={"xl"} />
      <Text>{name}</Text>
    </Group>
  );
}

export function LeftPanel({
  items,
  activeTab,
  setActiveTab,
  importModalIsOpen,
  openImport,
  closeImport,
  selected,
  setSelected,
  ...props
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchResults =
    searchTerm === ""
      ? items
      : items?.filter(({ name }) =>
          name.toLowerCase().includes(searchTerm.toLowerCase()),
        );

  return (
    <Paper
      style={{
        flex: 2,
        borderRadius: "8px",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        ...props.sx,
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
      <Box style={{ overflow: "auto", flexGrow: 1 }}>
        {searchResults &&
          searchResults.map(({ name, id }) => (
            <ListItem
              name={name}
              isSelected={id === selected}
              key={id}
              onClick={() => setSelected(id)}
            />
          ))}
      </Box>
      <ImportWaCustomers onClick={openImport} />
      <ImportWaCustomersModal
        opened={importModalIsOpen}
        close={closeImport}
        createGroup={activeTab === PromotionTab.Groups}
      />
    </Paper>
  );
}

function PromotionHeader({ activeTab, setActiveTab }) {
  const theme = useMantineTheme();

  return (
    <Box
      style={{
        borderRadius: "8px",
        background: "linear-gradient(271deg, #3F5BA9 -6.39%, #49C8E9 204.31%)",
        boxShadow: "2px 4px 7px 0px rgba(0, 0, 0, 0.06)",
      }}
      p="lg"
    >
      <Group justify="space-between">
        <Title
          style={{
            color: "white",
          }}
          order={2}
        >
          Promotion
        </Title>
        <Group justify="center">
          <TabSwitchButton
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabName={PromotionTab.Groups}
          />
          <TabSwitchButton
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabName={PromotionTab.Individuals}
          />
        </Group>
      </Group>
    </Box>
  );
}

function TabSwitchButton({ activeTab, setActiveTab, tabName }) {
  const selected = activeTab === tabName;
  return (
    <UnstyledButton
      py="xs"
      px="xl"
      onClick={() => setActiveTab(tabName)}
      style={{
        borderRadius: "100px",
        border: "2px solid white",
        borderColor: "white",
        backgroundColor: selected ? "white" : "transparent",
        color: selected ? "#3F5BA9" : "white",
        // '&:hover': {
        //   backgroundColor: "white !important",
        //   color: "#3F5BA9 !important",
        // }
      }}
      className={classes.unstyledBtn}
    >
      {tabName}
    </UnstyledButton>
  );
}

function SearchBar({ placeholder, searchTerm, setSearchTerm }) {
  const theme = useMantineTheme();

  return (
    <TextInput
      m={"sm"}
      leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
      radius="xl"
      size="md"
      placeholder={placeholder}
      rightSectionWidth={42}
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.currentTarget.value)}
    />
  );
}
