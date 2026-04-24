"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDisclosure } from "@mantine/hooks";
import { useExtracted } from "next-intl";

import { useAllMenus } from "@/backend/menu/menu.query";
import {
  GenericActionCard,
  GenericCardGrid,
} from "@/components/common/generic-card";
import { ListPageLayout } from "@/components/common/list-page-layout";
import { sortData } from "@/components/Dashboard/SortDropDown";
import { TeamSelector } from "@/components/input/TeamSelector";
import { CreateMenuModal } from "@/components/menu/CreateMenu";
import MenuCardMenu from "@/components/menu/MenuCardMenu";
import { currencyLabel } from "@/components/menu/util/currencyData";
import { Badge } from "@/components/ui/badge";
import DigitalMenuTourSteps from "@/components/WelcomeTour/components/DigitalMenuTourSteps";
import styles from "@/components/WelcomeTour/components/Tour.module.css";
import SelectedTeamContext from "@/context/SelectedTeam";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

type MenuCardBadgesProps = {
  readonly menu: Menu;
};

function MenuCardBadges({ menu }: Readonly<MenuCardBadgesProps>) {
  return (
    <div className="flex flex-wrap gap-2">
      {menu?.team?.code ? (
        <Badge variant="secondary" className="text-xs">
          {menu.team.code}
        </Badge>
      ) : null}

      {menu?.currency ? (
        <Badge variant="default" className="text-xs">
          {currencyLabel.find((data) => data.value === menu.currency)?.label ??
            menu.currency}
        </Badge>
      ) : null}
    </div>
  );
}

type MenuGridItemCardProps = {
  readonly menu: Menu;
  readonly onEditClick: (menu: Menu) => void;
  readonly onOpenMenu: (menuId: string) => void;
};

function MenuGridItemCard({
  menu,
  onEditClick,
  onOpenMenu,
}: Readonly<MenuGridItemCardProps>) {
  return (
    <GenericActionCard
      title={menu.name}
      titleTooltip={menu.name}
      subtitle={menu.displayName}
      actions={
        <MenuCardMenu
          menu={menu}
          menuId={menu.id}
          teamId={menu.teamId}
          handleEditClick={onEditClick}
        />
      }
      content={<MenuCardBadges menu={menu} />}
      createdAt={menu.createdAt}
      onClick={() => onOpenMenu(menu.id)}
    />
  );
}

export default function MenuPage() {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");

  const { user } = useUser();
  const { data: menus, isPending, isError, refetch } = useAllMenus();

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

  const filteredSortedMenus = useMemo(() => {
    const source = menus ?? [];
    const searchValue = search.trim().toLowerCase();

    const filtered = source.filter((menu) => {
      const matchTeam =
        selectedTeamId === "all" || !selectedTeamId
          ? true
          : menu.teamId === selectedTeamId;

      const matchSearch =
        !searchValue ||
        menu.name?.toLowerCase().includes(searchValue) ||
        menu.displayName?.toLowerCase().includes(searchValue);

      return matchTeam && matchSearch;
    });

    return sortData(filtered, sortOption) as Menu[];
  }, [menus, search, selectedTeamId, sortOption]);

  const canCreate = user?.role !== UserRole.MEMBER;

  return (
    <SelectedTeamContext.Provider
      value={React.useMemo(() => ({ selectedTeamId }), [selectedTeamId])}
    >
      <ListPageLayout
        canCreate={canCreate}
        createLabel={translations("Create Menu")}
        createDisabledText={translations(
          "You don't have permission to create a menu",
        )}
        docsUrl="menu"
        isLoading={isPending}
        queryKeys={["allMenus"]}
        search={search}
        searchPlaceholder={translations("Search menus...")}
        tourSteps={tourSteps}
        onCreate={handleCreateClick}
        onSearchChange={setSearch}
        sortValue={sortOption}
        onSortChange={setSortOption}
        rightControls={
          <TeamSelector
            value={selectedTeamId}
            onChange={setSelectedTeamId}
            enableAll
            allowDeselect={false}
          />
        }
        isError={isError}
        onRetry={refetch}
        isEmpty={!isPending && !isError && filteredSortedMenus.length === 0}
        emptyTitle={translations("No menus found")}
        emptyDescription={translations(
          "Try changing your team or search and create a new menu.",
        )}
      >
        <GenericCardGrid
          items={filteredSortedMenus}
          getKey={(menu) => menu.id}
          renderItem={(menu) => (
            <MenuGridItemCard
              menu={menu}
              onEditClick={handleEditClick}
              onOpenMenu={(menuId) => {
                router.push(`/dashboard/menu/${menuId}`);
              }}
            />
          )}
        />

        {selectedTeamId && (
          <CreateMenuModal
            opened={openCreateModal}
            close={handleCreateEditClose}
            editingItem={editingItem}
          />
        )}
      </ListPageLayout>
    </SelectedTeamContext.Provider>
  );
}
