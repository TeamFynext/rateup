import Image from "next/image";

import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";
import TextIllustration from "@/components/HomePage/components/TextIllustration";

import sectionsStyles from "../../Home/WhatCanYouDo/WhatCanYouDo.module.css";
import { sectionValues } from "./sectionValues";
import styles from "./WhatCanOrganizationsDo.module.css";

const cx = classNames.bind(styles);
const ssCx = classNames.bind(sectionsStyles);

function WhatCanOrganizationsDo() {
  return (
    <Stack className={cx("what-can-orgs-do-root-div")}>
      <h1 className={cx("heading")}>
        What can organizations do with{" "}
        <LightBlueGradientBg className={cx("light-blue-bg-span")}>
          RateUp's QR Studio?
        </LightBlueGradientBg>
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

export default WhatCanOrganizationsDo;
