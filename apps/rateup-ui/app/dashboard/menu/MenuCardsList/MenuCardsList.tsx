"use client";

import React, { useContext } from "react";

import { Box, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import clsx from "clsx";
import { useExtracted } from "next-intl";

import { useAllMenus } from "@/backend/menu/menu.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { MenuCardListSkeleton } from "@/components/animation/skeleton/menu/MenuCardList.skeleton";
import { sortData } from "@/components/Dashboard/SortDropDown";
import { MenuCard } from "@/components/menu/MenuCard";
import NothingFound from "@/components/NothingFound/NothingFound";
import SelectedTeamContext from "@/context/SelectedTeam";

import styles from "./MenuCardsList.module.css";

function MenuCardsList({ handleEditClick, sortOption }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const translations = useExtracted();
  const { isError, isPending, data: menus, refetch } = useAllMenus();
  const smallScreen = useMediaQuery("(max-width: 40em)");
  if (isPending) return <MenuCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={refetch} />;
  // Filter menus based on `selectedTeamId`
  const filteredMenus =
    selectedTeamId === "all"
      ? menus
      : menus?.filter((menu) => menu.teamId === selectedTeamId);

  // Sort menus based on `sorthandle`
  const sortedMenus = sortData(filteredMenus, sortOption);

  return (
    <Box
      className={clsx(
        `${styles["menu-cards-list-container"]}`,
        "cards-grid-global-class",
      )}
    >
      {sortedMenus?.length > 0 ? (
        sortedMenus?.map((menu) => {
          return (
            <MenuCard
              key={menu.id}
              menu={menu}
              handleEditClick={handleEditClick}
            />
          );
        })
      ) : (
        <Stack
          style={{
            gridArea: smallScreen ? 3 : 12,
            gridColumn: smallScreen ? 1 : 2,
          }}
        >
          <NothingFound text={translations("No menus available.")} />
        </Stack>
      )}
    </Box>
  );
}

export default MenuCardsList;
