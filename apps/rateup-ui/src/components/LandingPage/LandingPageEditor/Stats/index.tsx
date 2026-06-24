import { Group, Stack } from "@mantine/core";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import RefreshButton from "@/components/Button/RefreshButton.tsx";

import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";
import { useLandingPageObj } from "../LandingPageContext/LandingPageContext.tsx";

import styles from "./Stats.module.css";

function Stats() {
  const linktreeObj = useLandingPageObj();
  const { visitorsCount = 0 } = linktreeObj;
  const searchParams = useSearch({ strict: false });
  const shortUrlId = searchParams.shortUrlId;

  const { t: translations } = useTranslation();
  return (
    <PaperLayout className={styles["stats-page-root-div"]}>
      <Stack className={styles["stats-container"]}>
        <Group className={styles["visited-div"]}>
          <Group>
            <h1 className={styles["visited-text-h1"]}>{translations("Visited: ")}</h1>
            <p className={styles["visited-count-p"]}>{visitorsCount}</p>
            <RefreshButton queryKeys={["landingPage", shortUrlId as string]} />
          </Group>
        </Group>
      </Stack>
    </PaperLayout>
  );
}

export default Stats;
