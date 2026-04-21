"use client";

import { useSearchParams } from "next/navigation";

import { Group, Stack } from "@mantine/core";

import RefreshButton from "@/components/Button/RefreshButton";

import NothingFound from "../../../NothingFound/NothingFound";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext";
import styles from "./Stats.module.css";

function Stats() {
  const linktreeObj = useLinktreeObj();
  const { links, visitorsCount = 0 } = linktreeObj;
  const searchParams = useSearchParams();
  const shortUrlId = searchParams.get("shortUrlId");

  return (
    <PaperLayout className={styles["stats-page-root-div"]}>
      <Stack className={styles["stats-container"]}>
        <Group className={styles["visited-div"]}>
          <Group>
            <h1 className={styles["visited-text-h1"]}>Visited: </h1>
            <p className={styles["visited-count-p"]}>{visitorsCount}</p>
            <RefreshButton queryKeys={["linktree", shortUrlId as string]} />
          </Group>
        </Group>
        <Stack className={styles["links-container"]}>
          {!links || !links.length ? (
            <NothingFound text="No Links Found" />
          ) : (
            links?.map(({ id, linkDisplayName, linkUrl, noOfClicks = 0 }) => {
              return (
                <PaperLayout key={id} className={styles["link-card"]}>
                  <Group justify="space-between">
                    <Stack className={styles["name-and-url-container"]}>
                      <h2>{linkDisplayName}</h2>
                      <p>{linkUrl}</p>
                    </Stack>
                    <Group>
                      <p className={styles["no-of-clicks-p"]}>
                        <span>Number of Clicks: </span>
                        <span className={styles["no-of-clicks-number-span"]}>
                          {noOfClicks}
                        </span>
                      </p>
                    </Group>
                  </Group>
                </PaperLayout>
              );
            })
          )}
        </Stack>
      </Stack>
    </PaperLayout>
  );
}

export default Stats;
