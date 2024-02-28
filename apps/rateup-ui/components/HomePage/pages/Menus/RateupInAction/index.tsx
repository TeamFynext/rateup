import { Stack, Text, Title } from "@mantine/core";
import commonStyles from "../../../index.module.css";
import styles from "./RateupInAction.module.css";
import Image from "next/image";

function RateupInAction() {
  return (
    <Stack className={styles["rateup-in-action-section"]}>
      <Title order={1} className={styles["heading"]}>
        <span>Rate Up in Action</span>
        <span>Rate Up provide promising services</span>
      </Title>
      <Text className={styles["para"]}>
        Transform your restaurant into a trendsetting sensation with Rateup’s
        promise to craft a cutting-edge, contactless dining experience. Elevate
        your brand in the town by embracing our seamless QR Code menu service,
        making
        <span className={commonStyles["bold-span"]}>
          {" "}
          innovation a staple on your menu!
        </span>
      </Text>
      <Image
        className={styles["rateup-in-action-img"]}
        width={3347}
        height={2455}
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menus-page/rateup-in-action.png`}
        alt="Rate up menus ui illustration"
      />
    </Stack>
  );
}

export default RateupInAction;
