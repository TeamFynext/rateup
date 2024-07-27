import { useEffect } from "react";

import { Box, Flex, Group, Image } from "@mantine/core";
import parse from "html-react-parser";
import { produce } from "immer";

import { getPublicLandingPageWithShortId } from "@/backend/landingPage/landingPage.api";
import { usePageVisitsUpdateMutation } from "@/backend/landingPage/landingPage.query";
import tiptapDivStyles from "@/components/LandingPage/LandingPageEditor/Editor/RichTextEditor/RichTextEditor.module.css";

import styles from "./lp.module.css";

export const getServerSideProps = async (context) => {
  const { shortId } = context.params;
  const landingPageObj = await getPublicLandingPageWithShortId(shortId);
  if (landingPageObj?.isPublished) {
    return {
      props: {
        landingPageObj,
      },
    };
  } else {
    return {
      props: {
        landingPageObj: null,
      },
    };
  }
};

function PublicLandingPageComp({ landingPageObj }) {
  if (!landingPageObj) {
    return (
      <Group className={styles["not-available-div"]}>
        <Image src={"/images/bw-logo.png"} alt="logo" width={70} height={70} />
        <p className={styles["not-available-p"]}>Landing Page Not available</p>
      </Group>
    );
  }

  const { shortUrlId } = landingPageObj;
  const updatePageVisitsMutation = usePageVisitsUpdateMutation(shortUrlId);

  useEffect(() => {
    const landingPageVisitsData = localStorage.getItem("landingPageVisitsData");
    if (!landingPageVisitsData) {
      localStorage.setItem(
        "landingPageVisitsData",
        JSON.stringify({
          [shortUrlId]: {
            lastVisitedAt: new Date().toISOString(),
          },
        }),
      );
      updatePageVisitsMutation.mutate();
    } else if (landingPageVisitsData) {
      const parsedVisitsDataObj = JSON.parse(
        localStorage.getItem("landingPageVisitsData"),
      );
      const currentLinktreeLastVisited =
        parsedVisitsDataObj[shortUrlId]?.lastVisitedAt;
      if (!currentLinktreeLastVisited) {
        const updatedParsedVisitsDataObj = produce(
          parsedVisitsDataObj,
          (draft) => {
            draft[shortUrlId] = {
              lastVisitedAt: new Date().toISOString(),
            };
          },
        );
        localStorage.setItem(
          "landingPageVisitsData",
          JSON.stringify(updatedParsedVisitsDataObj),
        );
        updatePageVisitsMutation.mutate();
        return;
      }

      const newDateObj = new Date();
      // currentLinktreeLastVisited is an ISO time string.
      const lastVisitedDateObj = new Date(currentLinktreeLastVisited);

      const differenceInMinutes =
        (+newDateObj - +lastVisitedDateObj) / (1000 * 60);

      if (differenceInMinutes > 60) {
        const updatedParsedVisitsDataObj = produce(
          parsedVisitsDataObj,
          (draft) => {
            draft[shortUrlId].lastVisitedAt = new Date().toISOString();
          },
        );
        localStorage.setItem(
          "landingPageVisitsData",
          JSON.stringify(updatedParsedVisitsDataObj),
        );
        updatePageVisitsMutation.mutate();
      }
    }
  }, []);

  const { tiptapEditorContent } = landingPageObj;

  return (
    <Flex className={styles["root-div"]}>
      <Box className={`${tiptapDivStyles["tiptap-div"]} ${styles["tiptap"]}`}>
        {parse(tiptapEditorContent)}
      </Box>
    </Flex>
  );
}

export default PublicLandingPageComp;
