import { Box, Group, Stack } from "@mantine/core";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import styles from "./Stats.module.css";
import { useLandingPageObj } from "../LandingPageContext/LandingPageContext";
import NothingFound from "../../../NothingFound/NothingFound";

function Stats() {
  const landingPageObj = useLandingPageObj();
  const { links, visitorsCount = 0 } = landingPageObj;
  return (
    <PaperLayout className={styles["stats-page-root-div"]}>
      <Stack className={styles["stats-container"]}>
        <Group className={styles["visited-div"]}>
          <h1 className={styles["visited-text-h1"]}>Visited: </h1>
          <p className={styles["visited-count-p"]}>{visitorsCount}</p>
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
