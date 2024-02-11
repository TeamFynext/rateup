import React, { useContext, useState } from "react";
import { Group, SimpleGrid, Title, Space, Stack } from "@mantine/core";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { IconPlus, IconSelector } from "@tabler/icons-react";
import { useAllMenus } from "../../../backend/menu/menu.query";
import { MenuCard } from "../../../components/menu/MenuCard";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { CreateMenuModal } from "../../../components/menu/CreateMenu";
import SelectedTeamContext from "../../../context/SelectedTeam";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import { UserRole } from "../../../utils/enums";
import { useUser } from "../../../context/UserContext";
import NothingFound from "../../../components/NothingFound/NothingFound";
import CenteredSpinner from "../../../components/Loaders/CenteredSpinner";
import Heading from "../../../components/styled/Heading/Heading";

export default function MenuPage() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [sort, setSort] = useState(true);
  const { user } = useUser();

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
    <Stack h={"100%"}>
      <Group justify="space-between">
        <Group>
          <Heading title="Menus" titleprops={{ w: "fit-content" }} />
          {user?.role !== UserRole.MEMBER && (
            <RateupButtonBlue
              title="Create Menu"
              rightIcon={<IconPlus />}
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
      </Group>
      <Space h="lg" />
      <SimpleGrid
        p={"0.875rem"}
        spacing={"lg"}
        cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 3 }}
        style={{ overflow: "auto" }}
      >
        <SelectedTeamContext.Provider
          value={React.useMemo(() => ({ selectedTeamId }), [selectedTeamId])}
        >
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
    </Stack>
  );
}

function DisplayMenus({ handleEditClick, sorthandle }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const { isError, isLoading, data: menus } = useAllMenus();
  const smallScreen = useMediaQuery("(max-width: 40em)");

  if (isLoading || isError) {
    return (
      <Stack
        style={{
          gridArea: smallScreen ? 3 : 12,
          gridColumn: smallScreen ? 1 : 2,
        }}
      >
        <CenteredSpinner />;
      </Stack>
    );
  }
  // Filter menus based on `selectedTeamId`
  const filteredMenus =
    selectedTeamId === "all"
      ? menus
      : menus?.filter((menu) => menu.teamId === selectedTeamId);

  // Sort menus based on `sorthandle`
  const sortedMenus = filteredMenus?.slice()?.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sorthandle ? dateB - dateA : dateA - dateB;
  });
  return (
    <>
      {sortedMenus?.length > 0 ? (
        sortedMenus?.map((menu) => (
          <MenuCard
            key={menu.id}
            menu={menu}
            handleEditClick={handleEditClick}
          />
        ))
      ) : (
        <Stack
          style={{
            gridArea: smallScreen ? 3 : 12,
            gridColumn: smallScreen ? 1 : 2,
          }}
        >
          <NothingFound text="No menus available." />
        </Stack>
      )}
    </>
  );
}
