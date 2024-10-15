import { Box, Button, Flex, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import BookDemoContactForm from "@/components/HomePage/components/BookDemoContactForm";
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
          <BookDemoContactForm
            className={cx("enroll-form-div")}
            buttonText="Enroll for Loyalty Program"
          />
          <BookDemoContactForm
            className={cx("know-more-form-div")}
            buttonProps={{
              variant: "outline",
            }}
            buttonText="Know More"
          />
        </Flex>
      </Stack>
    </Flex>
  );
}

export default LoyaltyProgramBanner;
