import { Flex, Group, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import { imagesPath } from "@/utils/constants";

import styles from "./HassleFree.module.css";

const cx = classNames.bind(styles);

function HassleFree() {
  return (
    <Stack
      component={"section"}
      className={cx("hassle-free", "landing-page-section-root-common-styles")}
    >
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        <img
          src={`${imagesPath}/product-packaging-qr-page/hassle-free/rateup-star.svg`}
        />
        <span className={cx("heading-text-span")}>Hassle-Free With RateUp</span>
      </h1>

      <Stack className={cx("steps-container")}>
        <Group className={cx("steps-row")}>
          <Group className={cx("step-div")}>
            <div className={cx("step-count-number-div")}>1</div>
            <Text inherit>Create account</Text>
          </Group>
          <Group className={cx("step-div")}>
            <div className={cx("step-count-number-div")}>2</div>
            <Text inherit>Add your content link</Text>
          </Group>
        </Group>

        <Group className={cx("steps-row")}>
          <Group className={cx("step-div")}>
            <div className={cx("step-count-number-div")}>3</div>
            <Text inherit>Create Branded QR Code</Text>
          </Group>
          <Group className={cx("step-div")}>
            <div className={cx("step-count-number-div")}>4</div>
            <Text inherit>Download And Add To Packaging</Text>
          </Group>
        </Group>
      </Stack>

      <picture className={cx("picture-tag")}>
        <source
          type="image/webp"
          srcSet={`${imagesPath}/product-packaging-qr-page/hassle-free/qr-image.webp`}
        />
        <img
          src={`${imagesPath}/product-packaging-qr-page/hassle-free/qr-image.png`}
          alt="qr"
          loading="lazy"
        />
      </picture>
    </Stack>
  );
}

export default HassleFree;
