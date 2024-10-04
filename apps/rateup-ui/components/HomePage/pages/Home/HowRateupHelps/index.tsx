import { Group, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";
import { imagesPath } from "@/utils/constants";

import styles from "./HowRateupHelps.module.css";

const cx = classNames.bind(styles);

function HowRateupHelps() {
  return (
    <Stack
      component={"section"}
      className={cx(
        "how-rateup-helps-root-div",
        "landing-page-section-root-common-styles",
      )}
    >
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        How RateUp Helps{" "}
        <LightBlueGradientBg displayInline>Your Business</LightBlueGradientBg>
      </h1>
      <Group className={cx("images-container")}>
        <picture>
          {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
          <img
            src={`${imagesPath}/homepage/how-rateup-helps/how-rateup-helps.png`}
            alt="how rateup helps"
            loading="lazy"
          />
        </picture>

        <picture>
          {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
          <img
            src={`${imagesPath}/homepage/how-rateup-helps/decorative-img.png`}
            alt="Decorative Star"
            loading="lazy"
          />
        </picture>
      </Group>
    </Stack>
  );
}

export default HowRateupHelps;
