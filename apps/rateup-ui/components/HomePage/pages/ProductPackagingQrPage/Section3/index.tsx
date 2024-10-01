import Image from "next/image";

import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import TextIllustration from "@/components/HomePage/components/TextIllustration";

import sectionsStyles from "../../Home/WhatCanYouDo/WhatCanYouDo.module.css";
import styles from "./Section.module.css";
import { sectionValues } from "./sectionValues";

const cx = classNames.bind(styles);
const ssCx = classNames.bind(sectionsStyles);

function Section3() {
  return (
    <Stack className={cx("section-root-div")}>
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        Benefits of using smart QR codes on product packaging
      </h1>
      <Box className={cx("sections-container")}>
        {sectionValues.map(
          (
            {
              id,
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
                <Stack className={ssCx("section-details")}>
                  <h2 className={ssCx("section-heading")}>
                    <span className={ssCx("large-text-span")}>
                      {headingLargeText}
                    </span>
                  </h2>
                  <p className={ssCx("section-description")}>{description}</p>
                </Stack>
                <Image
                  className={ssCx("section-image")}
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

export default Section3;
