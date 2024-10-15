import { Box, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";
import Picture from "@/components/HomePage/components/Picture";
import { imagesPath } from "@/utils/constants";

import styles from "./OneSmartQr.module.css";

const cx = classNames.bind(styles);

function OneSmartQr() {
  return (
    <Stack className={cx("landing-page-section-root-common-styles")}>
      <Stack className={cx("one-smart-qr-root-div")}>
        <h1 className={cx("heading")}>
          <LightBlueGradientBg
            className={cx("one-smart-qr-text-span")}
            displayInline
          >
            <Text
              component="span"
              variant="gradient"
              gradient={{ from: "#387ADF", to: "#50C4ED", deg: 90 }}
              inherit
            >
              ONE SMART QR-Code
            </Text>
          </LightBlueGradientBg>{" "}
          <span>Endless Possibilites</span>
        </h1>

        <Box className={cx("image-container")}>
          <Picture
            alt="one smart qr endless possibilities"
            src={`${imagesPath}/homepage/one-smart-qr-endless-possibilities.png`}
            sourcesArr={[
              {
                srcSet: `${imagesPath}/homepage/one-smart-qr-endless-possibilities.webp`,
                type: "image/webp",
              },
            ]}
          />
        </Box>
      </Stack>
    </Stack>
  );
}

export default OneSmartQr;
