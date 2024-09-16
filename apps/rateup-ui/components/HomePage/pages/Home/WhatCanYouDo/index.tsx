import Image from "next/image";
import Link from "next/link";

import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";

import TextIllustration from "../../../components/TextIllustration";
import { sectionValues } from "./sectionValues";
import styles from "./WhatCanYouDo.module.css";

const cx = classNames.bind(styles);

function WhatCanYouDo() {
  return (
    <Stack className={cx("what-can-you-do-root-div")} id="our-features">
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        What can you do with the{" "}
        <LightBlueGradientBg>RateUp platform?</LightBlueGradientBg>
      </h1>
      <Box className={cx("sections-container")}>
        {sectionValues.map(
          (
            {
              id,
              headingSmallText,
              headingLargeText,
              description,
              imageUrl,
              imageAlt,
              imageWidth,
              imageHeight,
            },
            index,
          ) => {
            return (
              <TextIllustration key={id} imageAsFirstElement={index % 2 === 1}>
                <Stack className={cx("section-details")}>
                  <h2 className={cx("section-heading")}>
                    <span className={cx("small-text-span")}>
                      {headingSmallText}
                    </span>
                    <span className={cx("large-text-span")}>
                      {headingLargeText}
                    </span>
                  </h2>
                  <p className={cx("section-description")}>{description}</p>
                  <Link className={cx("learn-more-link")} href={"#"}>
                    Learn More
                  </Link>
                </Stack>
                <Image
                  className={cx("section-image")}
                  src={imageUrl}
                  alt={imageAlt}
                  width={imageWidth}
                  height={imageHeight}
                />
              </TextIllustration>
            );
          },
        )}
      </Box>
    </Stack>
  );
}

export default WhatCanYouDo;
