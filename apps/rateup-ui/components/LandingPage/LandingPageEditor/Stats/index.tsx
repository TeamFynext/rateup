"use client";

import { useSearchParams } from "next/navigation";

import { Group, Stack } from "@mantine/core";
import { useExtracted } from "next-intl";

import RefreshButton from "@/components/Button/RefreshButton";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import { useLandingPageObj } from "../LandingPageContext/LandingPageContext";
import styles from "./Stats.module.css";

function Stats() {
  const linktreeObj = useLandingPageObj();
  const { visitorsCount = 0 } = linktreeObj;
  const searchParams = useSearchParams();
  const shortUrlId = searchParams.get("shortUrlId");

  const translations = useExtracted();
  return (
    <PaperLayout className={styles["stats-page-root-div"]}>
      <Stack className={styles["stats-container"]}>
        <Group className={styles["visited-div"]}>
          <Group>
            <h1 className={styles["visited-text-h1"]}>
              {translations("Visited: ")}
            </h1>
            <p className={styles["visited-count-p"]}>{visitorsCount}</p>
            <RefreshButton queryKeys={["landingPage", shortUrlId as string]} />
          </Group>
        </Group>
      </Stack>
    </PaperLayout>
  );
}

export default Stats;
