import {
  Group,
  Flex,
  SimpleGrid,
  Title,
  Space,
  ScrollArea,
} from "@mantine/core";
import { useContext, useState } from "react";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { IconPlus, IconSelector } from "@tabler/icons-react";
import { useAllMenus } from "../../../backend/menu/menu.query";
import { MenuCard } from "../../../components/menu/MenuCard";
import { useDisclosure } from "@mantine/hooks";
import { CreateMenuModal } from "../../../components/menu/CreateMenu";
import SelectedTeamContext from "../../../context/SelectedTeam";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import { UserRole } from "../../../utils/enums";
import { useUser } from "../../../context/UserContext";

export default function MenuPage() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [sort, setSort] = useState(true);
  const { user, setUser } = useUser();

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
      <Flex justify={"space-between"} align={"center"} mb={"lg"}>
        <Group>
          <Title size="calc(2rem * var(--mantine-scale))">All Menus</Title>
          {user?.role !== UserRole.MEMBER && (
            <RateupButtonBlue
              title="Add Menu"
              rightIcon={<IconPlus />}
              radius="xl"
              size="md"
              onClick={handleCreateClick}
            />
          )}
        </Group>
        <Group>
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
            allowDeselect={false}
          />
          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={"Sort"}
            variant="subtle"
            rightIcon={<IconSelector size="1rem" />}
          />
        </Group>
      </Flex>
      <Space h="xl" />

      <ScrollArea h="70vh">
        <SimpleGrid
          p={1}
          spacing={"lg"}
          cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 3 }}
          my="lg"
        >
          <SelectedTeamContext.Provider value={{ selectedTeamId }}>
            {selectedTeamId && (
              <CreateMenuModal
                opened={openCreateModal}
                close={handleCreateEditClose}
                editingItem={editingItem}
              />
            )}
            <DisplayMenus handleEditClick={handleEditClick} sorthandle={sort} />
          </SelectedTeamContext.Provider>
        </SimpleGrid>
      </ScrollArea>
    </>
  );
}

function DisplayMenus({ handleEditClick, sorthandle }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);

  const { isError, isLoading, data: menus } = useAllMenus();

  if (isLoading || isError) {
    return null;
  }
  // Filter menus based on `selectedTeamId`
  const filteredMenus =
    selectedTeamId === "all"
      ? menus
      : menus.filter((menu) => menu.teamId === selectedTeamId);

  // Sort menus based on `sorthandle`
  const sortedMenus = filteredMenus?.slice()?.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sorthandle ? dateA - dateB : dateB - dateA;
  });

  if (sortedMenus?.length === 0) return <>No Menu data Avaliable</>;

  return (
    <>
      {sortedMenus?.map((menu) => (
        <MenuCard key={menu.id} menu={menu} handleEditClick={handleEditClick} />
      ))}
    </>
  );
}
