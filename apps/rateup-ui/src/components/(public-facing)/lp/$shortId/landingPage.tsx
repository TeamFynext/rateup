import { Box, Flex } from "@mantine/core";
import parse from "html-react-parser";
import { produce } from "immer";
import React, { useEffect } from "react";

import { usePageVisitsUpdateMutation } from "@/backend/landingPage/landingPage.query";

import styles from "./lp.module.css";
import tiptapDivStyles from "@/components/LandingPage/LandingPageEditor/Editor/RichTextEditor/RichTextEditor.module.css";

const LandingPageC = ({ shortUrlId, landingPageObj }) => {
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
      const parsedVisitsDataObj = JSON.parse(localStorage.getItem("landingPageVisitsData"));
      const currentLinktreeLastVisited = parsedVisitsDataObj[shortUrlId]?.lastVisitedAt;
      if (!currentLinktreeLastVisited) {
        const updatedParsedVisitsDataObj = produce(parsedVisitsDataObj, (draft) => {
          draft[shortUrlId] = {
            lastVisitedAt: new Date().toISOString(),
          };
        });
        localStorage.setItem("landingPageVisitsData", JSON.stringify(updatedParsedVisitsDataObj));
        updatePageVisitsMutation.mutate();
        return;
      }

      const newDateObj = new Date();
      // currentLinktreeLastVisited is an ISO time string.
      const lastVisitedDateObj = new Date(currentLinktreeLastVisited);

      const differenceInMinutes = (+newDateObj - +lastVisitedDateObj) / (1000 * 60);

      if (differenceInMinutes > 60) {
        const updatedParsedVisitsDataObj = produce(parsedVisitsDataObj, (draft) => {
          draft[shortUrlId].lastVisitedAt = new Date().toISOString();
        });
        localStorage.setItem("landingPageVisitsData", JSON.stringify(updatedParsedVisitsDataObj));
        updatePageVisitsMutation.mutate();
      }
    }
  }, []);

  const { tiptapEditorContent } = landingPageObj;

  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Flex className={styles["root-div"]}>
      <Box className={`${tiptapDivStyles["tiptap-div"]} ${styles["tiptap"]}`}>
        {mounted ? parse(tiptapEditorContent) : null}
      </Box>
    </Flex>
  );
};

export default LandingPageC;
