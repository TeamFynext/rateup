import React, { useContext } from "react";
import SelectedTeamContext from "../../../../context/SelectedTeam";
import { useAllMenus } from "../../../../backend/menu/menu.query";
import { useMediaQuery } from "@mantine/hooks";
import { Box, Stack } from "@mantine/core";
import { sortData } from "../../../../components/Dashboard/SortDropDown";
import { MenuCard } from "../../../../components/menu/MenuCard";
import NothingFound from "../../../../components/NothingFound/NothingFound";
import styles from "./MenuCardsList.module.css";
import ErrorComponent from "../../../../components/404/ErrorComponent";
import { MenuCardListSkeleton } from "../../../../components/animation/skeleton/menu/MenuCardList.skeleton";
import clsx from "clsx";

function MenuCardsList({ handleEditClick, sortOption }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const {
    isError,
    isPending,
    data: menus,
    refetch,
    isRefetching,
  } = useAllMenus();
  const smallScreen = useMediaQuery("(max-width: 40em)");
  if (isPending || isRefetching) return <MenuCardListSkeleton />;
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
          <NothingFound text="No menus available." />
        </Stack>
      )}
    </Box>
  );
}

export default MenuCardsList;
