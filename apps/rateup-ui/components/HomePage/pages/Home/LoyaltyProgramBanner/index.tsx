import { Box, Button, Flex, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import Picture from "@/components/HomePage/components/Picture";
import { imagesPath } from "@/utils/constants";

import styles from "./LoyaltyProgramBanner.module.css";

const cx = classNames.bind(styles);

function LoyaltyProgramBanner() {
  return (
    <Flex className={cx("loyalty-banner-root-div")}>
      <Flex className={cx("image-container")}>
        <Picture
          src={`${imagesPath}/homepage/whatsapp-campaigns.png`}
          alt="Loyalty Program illustration"
          sourcesArr={[
            {
              srcSet: `${imagesPath}/homepage/whatsapp-campaigns.png`,
              type: "image/png",
            },
          ]}
        />
      </Flex>
      <Stack className={cx("text-and-btns-container")}>
        <Text className={cx("desc-p")}>
          <span>Don't know how to </span>
          <span>improve customer engagement </span>
          <span>for your business?</span>
        </Text>
        <Flex className={cx("btns-container")}>
          <Button className={cx("enroll-btn")}>
            Enroll for Loyalty Program
          </Button>
          <Button className={cx("know-more-btn")} variant="outline">
            Know More
          </Button>
        </Flex>
      </Stack>
    </Flex>
  );
}

export default LoyaltyProgramBanner;
