import { Box, Group, Image, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import { imagesPath } from "../../constants";
import BookDemoContactForm from "../BookDemoContactForm";
import styles from "./Banner.module.css";

const cx = classNames.bind(styles);

function Banner({ title, subtitle }) {
  return (
    <Box className={cx("banner-div-wrapper")}>
      <Group className={cx("banner-div")}>
        <Box className={cx("star-img-container")}>
          <Image src={`${imagesPath}/rateup-star-blue.svg`} alt="Star" />
        </Box>
        <Stack className={cx("heading-and-p-container")}>
          <h1 className={cx("title-h1")}>{title}</h1>
          <p className={cx("subtitle-p")}>{subtitle}</p>
        </Stack>

        <BookDemoContactForm
          className={cx("book-demo-root")}
          buttonProps={{ whiteBackgroundGradientText: true }}
        />
      </Group>
    </Box>
  );
}

export default Banner;
