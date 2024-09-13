import Image from "next/image";

import { Flex, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./Card.module.css";
import ShapeSvg from "./ShapeSvg";

const cx = classNames.bind(styles);

function Card({ heading, description, imageUrl, width, height, alt }) {
  return (
    <Stack className={`${cx("card")} card`}>
      {heading && <h1 className={cx("heading")}>{heading}</h1>}
      <p className={cx("description")}>{description}</p>
      <Flex className={`${cx("image-container")} image-container`}>
        <Image
          className={cx("card-image")}
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
        />
      </Flex>
      <ShapeSvg />
    </Stack>
  );
}

export default Card;
