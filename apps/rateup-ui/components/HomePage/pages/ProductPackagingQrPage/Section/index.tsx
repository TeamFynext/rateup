import Image from "next/image";

import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import TextIllustration from "@/components/HomePage/components/TextIllustration";

import sectionsStyles from "../../Home/WhatCanYouDo/WhatCanYouDo.module.css";
import styles from "./Section.module.css";
import { sectionValues } from "./sectionValues";

const cx = classNames.bind(styles);
const ssCx = classNames.bind(sectionsStyles);

function Section() {
  return (
    <Stack className={cx("section-root-div")}>
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

export default Section;
