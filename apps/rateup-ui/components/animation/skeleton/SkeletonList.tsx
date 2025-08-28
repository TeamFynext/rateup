"use client";

import React from "react";

import { Box } from "@mantine/core";
import clsx from "clsx";

import styles from "@/app/dashboard/menu/MenuCardsList/MenuCardsList.module.css";

import useResponsiveCardCount from "../../../hooks/useResponsiveCardCount";

const SkeletonList = ({ children }) => {
  const cardCount = useResponsiveCardCount();
  return (
    <Box
      className={clsx(
        styles["menu-cards-list-container"],
        "cards-grid-global-class",
      )}
    >
      {Array.from({ length: cardCount ?? 20 }).map((_, i) => (
        <div key={i}>{children}</div>
      ))}
    </Box>
  );
};

export default SkeletonList;
