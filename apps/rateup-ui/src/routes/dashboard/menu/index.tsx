import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllMenus } from "@/backend/menu/menu.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { CreateMenuModal } from "@/components/menu/CreateMenu.tsx";
import MenuCardMenu from "@/components/menu/MenuCardMenu.tsx";
import { currencyLabel } from "@/components/menu/util/currencyData.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import DigitalMenuTourSteps from "@/components/WelcomeTour/components/DigitalMenuTourSteps.jsx";
import WelcomeTour from "@/components/WelcomeTour/WelcomeTour.tsx";
import SelectedTeamContext from "@/context/SelectedTeam.ts";
import { useUser } from "@/context/UserContext.tsx";
import { docsPath } from "@/utils/constants.ts";
import { UserRole } from "@/utils/enums/index.ts";

import styles from "@/components/WelcomeTour/components/Tour.module.css";

export const Route = createFileRoute("/dashboard/menu/")({
  component: MenuPage,
});

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
          {currencyLabel.find((data) => data.value === menu.currency)?.label ?? menu.currency}
        </Badge>
      ) : null}
    </div>
  );
}

function MenuPage() {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [openCreateModal, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");

  const { user } = useUser();
  const { data: menus, isPending, isError, refetch } = useAllMenus();

  const tourSteps = DigitalMenuTourSteps({ styles });
  const { t: translations } = useTranslation();

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
        selectedTeamId === "all" || !selectedTeamId ? true : menu.teamId === selectedTeamId;

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
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            {canCreate ? (
              <Button onClick={handleCreateClick}>
                {translations("Create Menu")}
                <IconPlus size={16} className="ml-2" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button disabled>
                      {translations("Create Menu")}
                      <IconPlus size={16} className="ml-2" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{translations("You don't have permission to create a menu")}</p>
                </TooltipContent>
              </Tooltip>
            )}

            <InfoButton docUrl={`${docsPath}/menu`} />
            {tourSteps && <WelcomeTour steps={tourSteps} />}
            <RefreshButton queryKeys={["allMenus"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search menus...")}
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
            <TeamSelector
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              enableAll
              allowDeselect={false}
            />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isPending}
          isError={isError}
          isEmpty={!isPending && !isError && filteredSortedMenus.length === 0}
          emptyTitle={translations("No menus found")}
          emptyDescription={translations("Try changing your team or search and create a new menu.")}
          onRetry={refetch}
        >
          <CardGrid
            items={filteredSortedMenus}
            getKey={(menu) => menu.id}
            renderItem={(menu) => (
              <ActionCard
                title={menu.name}
                subtitle={menu.displayName}
                actions={
                  <MenuCardMenu
                    menu={menu}
                    menuId={menu.id}
                    teamId={menu.teamId}
                    handleEditClick={handleEditClick}
                  />
                }
                content={<MenuCardBadges menu={menu} />}
                createdAt={menu.createdAt}
                onClick={() => {
                  navigate({
                    to: `/dashboard/menu/${menu.id}`,
                  });
                }}
              />
            )}
          />
        </ListPageContent>
      </ListPage>

      {selectedTeamId && (
        <CreateMenuModal
          opened={openCreateModal}
          close={handleCreateEditClose}
          editingItem={editingItem}
        />
      )}
    </SelectedTeamContext.Provider>
  );
}
