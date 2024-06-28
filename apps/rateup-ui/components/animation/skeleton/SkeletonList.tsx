import React from "react";
import { Box } from "@mantine/core";
import styles from "../../../pages/dashboard/menu/MenuCardsList/MenuCardsList.module.css";
import useResponsiveCardCount from "../../../hooks/useResponsiveCardCount";
import clsx from "clsx";

const SkeletonList = ({ children }) => {
  const cardCount = useResponsiveCardCount();
  return (
    <Box
      className={clsx(
        styles["menu-cards-list-container"],
        "cards-grid-global-class",
      )}
    >
      {Array.from({ length: cardCount ?? 20 }).map(() => (
        <>{children}</>
      ))}
    </Box>
  );
};

export default SkeletonList;
