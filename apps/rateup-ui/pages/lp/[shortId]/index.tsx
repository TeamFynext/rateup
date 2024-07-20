import { getPublicLandingPageWithShortId } from "@/backend/landingPage/landingPage.api";
import { Box, Flex, Group, Image } from "@mantine/core";
import parse from "html-react-parser";

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

  const { tiptapEditorContent } = landingPageObj;

  return (
    <Flex className={styles["root-div"]}>
      <Box>{parse(tiptapEditorContent)}</Box>
    </Flex>
  );
}

export default PublicLandingPageComp;
