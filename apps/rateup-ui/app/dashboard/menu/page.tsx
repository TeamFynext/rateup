"use client";

import React, { useState } from "react";

import { Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import InfoButton from "../../../components/Button/InfoButton";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import RefreshButton from "../../../components/Button/RefreshButton";
import SortDropdown from "../../../components/Dashboard/SortDropDown";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { CreateMenuModal } from "../../../components/menu/CreateMenu";
import DigitalMenuTourSteps from "../../../components/WelcomeTour/components/DigitalMenuTourSteps";
import styles from "../../../components/WelcomeTour/components/Tour.module.css";
import WelcomeTour from "../../../components/WelcomeTour/WelcomeTour";
import SelectedTeamContext from "../../../context/SelectedTeam";
import { useUser } from "../../../context/UserContext";
import { docsPath } from "../../../utils/constants";
import { UserRole } from "../../../utils/enums";
import MenuCardsList from "./MenuCardsList/MenuCardsList";

export default function MenuPage() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [sortOption, setSortOption] = useState("latest");
  const { user } = useUser();
  const tourSteps = DigitalMenuTourSteps({ styles });
  const translations = useExtracted();
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
          {user?.role !== UserRole.MEMBER && (
            <RateupButtonBlue
              className={styles["create-menu-button"]}
              title={translations("Create Menu")}
              rightIcon={<IconPlus />}
              onClick={handleCreateClick}
            />
          )}
          <InfoButton docUrl={`${docsPath}/menu`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["allMenus"]} />
        </Group>
        <Group>
          <TeamSelector
            className={styles["team-select-option"]}
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
            allowDeselect={false}
          />
          <Group className={styles["sort-dropdown"]}>
            <SortDropdown
              onSortChange={onSortChange}
              defaultSortOption={sortOption}
            />
          </Group>
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
