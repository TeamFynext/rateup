import { Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./Card.module.css";

const cx = classNames.bind(styles);

type CardProps = {
  className: string;
  id: number;
  heading: string;
  description: string;
  imgSrc: string;
  imgAlt: string;
};

function Card({
  id,
  className,
  heading,
  description,
  imgSrc,
  imgAlt,
}: CardProps) {
  return (
    <Stack className={cx("card", className)}>
      <h2 className={cx("heading")}>{heading}</h2>
      <Stack className={cx("image-container", "image-container-global")}>
        <picture className={cx("picture-ele")}>
          <img
            className={cx("card-image", "card-image-global")}
            src={imgSrc}
            alt={imgAlt}
            loading="lazy"
          />
        </picture>
      </Stack>
      <Text className={cx("description-p", "description-p-global")}>
        {description}
      </Text>
    </Stack>
  );
}

export default Card;
