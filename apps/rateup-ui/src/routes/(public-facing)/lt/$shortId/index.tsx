import { createFileRoute } from "@tanstack/react-router";

import { getPublicLinktreeWithShortId } from "@/backend/linktree/linktree.api";
import LinkTreeC from "@/components/(public-facing)/lt/$shortId/linktreeC.tsx";
import { rateupIconBw } from "@/utils/constants";

import styles from "@/components/(public-facing)/lt/$shortId/lt.module.css";

export const Route = createFileRoute("/(public-facing)/lt/$shortId/")({
  component: Lt,
  loader: async ({ params }) => {
    const { shortId } = params;
    const linktreeObj = await getPublicLinktreeWithShortId(shortId);
    if (linktreeObj?.isPublished) {
      return linktreeObj;
    } else {
      return {
        linktreeObj: null,
      };
    }
  },
});

// Linktree Public Page
function Lt() {
  const linktreeObj = Route.useLoaderData();
  if (!linktreeObj) {
    return (
      <div className={`flex items-center gap-2 ${styles["not-available-div"]}`}>
        <img src={rateupIconBw} alt="logo" width={70} height={70} />
        <p className={styles["not-available-p"]}>Linktree Not available</p>
      </div>
    );
  }
  return <LinkTreeC linktreeObj={linktreeObj} />;
}
