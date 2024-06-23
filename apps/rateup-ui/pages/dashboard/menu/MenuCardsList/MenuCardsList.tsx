import React, { useContext } from "react";
import SelectedTeamContext from "../../../../context/SelectedTeam";
import { useAllMenus } from "../../../../backend/menu/menu.query";
import { useMediaQuery } from "@mantine/hooks";
import { Box, Stack } from "@mantine/core";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { sortData } from "../../../../components/Dashboard/SortDropDown";
import { MenuCard } from "../../../../components/menu/MenuCard";
import NothingFound from "../../../../components/NothingFound/NothingFound";
import styles from "./MenuCardsList.module.css";

function MenuCardsList({ handleEditClick, sortOption }) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const { isError, isLoading, data: menus } = useAllMenus();
  const smallScreen = useMediaQuery("(max-width: 40em)");

  if (isLoading || isError) {
    return <RateupLoader />;
  }
  // Filter menus based on `selectedTeamId`
  const filteredMenus =
    selectedTeamId === "all"
      ? menus
      : menus?.filter((menu) => menu.teamId === selectedTeamId);

  // Sort menus based on `sorthandle`
  const sortedMenus = sortData(filteredMenus, sortOption);

  let cardsListContainerClassName = `${styles["menu-cards-list-container"]}`;
  if (sortedMenus?.length > 0)
    cardsListContainerClassName += " cards-grid-global-class";

  return (
    <Box className={cardsListContainerClassName}>
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
