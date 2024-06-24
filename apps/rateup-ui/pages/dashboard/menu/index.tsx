import { Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import React, { useState } from "react";
import InfoButton from "../../../components/Button/InfoButton";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import RefreshButton from "../../../components/Button/RefreshButton";
import SortDropdown from "../../../components/Dashboard/SortDropDown";
import { TeamSelector } from "../../../components/input/TeamSelector";
import Heading from "../../../components/styled/Heading/Heading";
import { useUser } from "../../../context/UserContext";
import { docsPath } from "../../../utils/constants";
import { UserRole } from "../../../utils/enums";
import MenuCardsList from "./MenuCardsList/MenuCardsList";
import SelectedTeamContext from "../../../context/SelectedTeam";
import { CreateMenuModal } from "../../../components/menu/CreateMenu";

export default function MenuPage() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [sortOption, setSortOption] = useState("latest");
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
  const onSortChange = (value) => {
    setSortOption(value);
  };

  return (
    <Stack h={"100%"}>
      <Group justify="space-between">
        <Group>
          <Heading title="Menus" titleprops={{ w: "fit-content" }} />
          <InfoButton docUrl={`${docsPath}/menu`} />
          <RefreshButton queryKeys={["allMenus"]} />
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
          <SortDropdown
            onSortChange={onSortChange}
            defaultSortOption={sortOption}
          />
        </Group>
      </Group>

      <SelectedTeamContext.Provider
        value={React.useMemo(() => ({ selectedTeamId }), [selectedTeamId])}
      >
        <MenuCardsList
          handleEditClick={handleEditClick}
          sortOption={sortOption}
        />
        {selectedTeamId && (
          <CreateMenuModal
            opened={openCreateModal}
            close={handleCreateEditClose}
            editingItem={editingItem}
          />
        )}
      </SelectedTeamContext.Provider>
    </Stack>
  );
}
