import {
  Center,
  Container,
  Flex,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useContext, useState } from "react";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { IconPlus } from "@tabler/icons-react";
import { useMenusByTeamId } from "../../../backend/menu/menu.query";
import { MenuCard } from "../../../components/menu/MenuCard";
import { useDisclosure } from "@mantine/hooks";
import { CreateMenuModal } from "../../../components/menu/CreateMenu";
import SelectedTeamContext from "../../../context/SelectedTeam";

export default function MenuPage() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);

  function handleEditClick(menu: Menu) {
    setEditingItem(menu);
    open();
  }
  function handleCreateClick() {
    setEditingItem(null);
    open();
  }
  function handleCreateEditClose() {
    setEditingItem(null);
    close();
  }

  return (
    <>
      <Flex justify={"end"} mb="xs">
        <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} />
      </Flex>
      <SimpleGrid
        spacing={"lg"}
        cols={{ base: 4, sm: 2, md: 2, lg: 2, xl: 3 }}

        //VERIFY MANTNE
      >
        <Paper
          p="xl"
          shadow="lg"
          radius="lg"
          style={{ cursor: "pointer" }}
          onClick={handleCreateClick}
        >
          <Center h="100%">
            <Stack align="center">
              <IconPlus size={36} />
              <Text size="xl" fw={700}>
                Add Menu
              </Text>
            </Stack>
          </Center>
        </Paper>
        <SelectedTeamContext.Provider value={{ selectedTeamId }}>
          {selectedTeamId && (
            <CreateMenuModal
              opened={openCreateModal}
              close={handleCreateEditClose}
              editingItem={editingItem}
            />
          )}
          <DisplayMenus handleEditClick={handleEditClick} />
        </SelectedTeamContext.Provider>
      </SimpleGrid>
    </>
  );
}

function DisplayMenus({ handleEditClick }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const { isError, isLoading, data: menus } = useMenusByTeamId(selectedTeamId);

  if (isLoading || isError) return null;

  return (
    <>
      {menus.map((menu) => (
        <MenuCard key={menu.id} menu={menu} handleEditClick={handleEditClick} />
      ))}
    </>
  );
}
