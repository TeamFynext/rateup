import { Group, Image } from "@mantine/core";

import { getPublicLinktreeWithShortId } from "../../../../backend/linktree/linktree.api";
import LinkTreeC from "./linktreeC";
import styles from "./lt.module.css";

const getData = async (shortId) => {
  const linktreeObj = await getPublicLinktreeWithShortId(shortId);
  if (linktreeObj?.isPublished) {
    return linktreeObj;
  } else {
    return {
      linktreeObj: null,
    };
  }
};

// Linktree Public Page
async function Lt(props) {
  const params = await props?.params;
  const { shortId } = params;
  const linktreeObj = await getData(shortId);
  if (!linktreeObj) {
    return (
      <Group className={styles["not-available-div"]}>
        <Image src={"/images/bw-logo.png"} alt="logo" width={70} height={70} />
        <p className={styles["not-available-p"]}>Linktree Not available</p>
      </Group>
    );
  }
  return <LinkTreeC linktreeObj={linktreeObj} />;
}

export default Lt;
