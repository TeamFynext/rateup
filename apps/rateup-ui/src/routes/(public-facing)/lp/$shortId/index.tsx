import { Group, Image } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { getPublicLandingPageWithShortId } from "@/backend/landingPage/landingPage.api";

import LandingPageC from "../../../../components/(public-facing)/lp/$shortId/landingPage.tsx";
import styles from "../../../../components/(public-facing)/lp/$shortId/lp.module.css";

export const Route = createFileRoute("/(public-facing)/lp/$shortId/")({
  component: PublicLandingPageComp,
});

export const getData = async (shortId) => {
  const landingPageObj = await getPublicLandingPageWithShortId(shortId);
  if (landingPageObj?.isPublished) {
    return landingPageObj;
  } else {
    return {
      landingPageObj: null,
    };
  }
};

async function PublicLandingPageComp(props) {
  const params = await props?.params;
  const { shortId } = params;
  const landingPageObj = await getData(shortId);
  if (!landingPageObj) {
    return (
      <Group className={styles["not-available-div"]}>
        <Image src={"/images/bw-logo.png"} alt="logo" width={70} height={70} />
        <p className={styles["not-available-p"]}>Landing Page Not available</p>
      </Group>
    );
  }

  const { shortUrlId } = landingPageObj;
  return (
    <LandingPageC landingPageObj={landingPageObj} shortUrlId={shortUrlId} />
  );
}
