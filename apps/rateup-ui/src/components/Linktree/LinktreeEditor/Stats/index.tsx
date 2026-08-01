import { useSearch } from "@tanstack/react-router";

import type { LinktreeLink } from "@/backend/linktree/linktree.api.ts";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils";

import NothingFound from "../../../NothingFound/NothingFound.tsx";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext.tsx";

import styles from "./Stats.module.css";

function Stats() {
  const linktreeObj = useLinktreeObj();
  const { links, visitorsCount = 0 } = linktreeObj;
  const searchParams = useSearch({ strict: false });
  const shortUrlId = searchParams.shortUrlId;

  return (
    <Card className={"p-4"}>
      <div className={cn("flex flex-col gap-4", styles["stats-container"])}>
        <div className={cn("flex items-center gap-2", styles["visited-div"])}>
          <div className="flex items-center gap-2">
            <h1 className={styles["visited-text-h1"]}>Visited: </h1>
            <p className={styles["visited-count-p"]}>{String(visitorsCount)}</p>
            <RefreshButton queryKeys={["linktree", shortUrlId as string]} />
          </div>
        </div>
        <div className={cn("flex flex-col gap-4", styles["links-container"])}>
          {!links || !links.length ? (
            <NothingFound text="No Links Found" />
          ) : (
            links?.map(
              ({ id, linkDisplayName = "", linkUrl = "", noOfClicks = 0 }: LinktreeLink) => {
                return (
                  <Card key={id} className={"p-4"}>
                    <div className="flex items-center justify-between gap-2">
                      <div className={cn("flex flex-col gap-4", styles["name-and-url-container"])}>
                        <h2>{linkDisplayName}</h2>
                        <p>{linkUrl}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={styles["no-of-clicks-p"]}>
                          <span>Number of Clicks: </span>
                          <span className={styles["no-of-clicks-number-span"]}>{noOfClicks}</span>
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              },
            )
          )}
        </div>
      </div>
    </Card>
  );
}

export default Stats;
