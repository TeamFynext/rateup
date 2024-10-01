import { Flex, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import cardsData from "./cardsData";
import styles from "./Section4.module.css";

const cx = classNames.bind(styles);

function Section4() {
  return (
    <Flex
      className={cx("section4-div", "landing-page-section-root-common-styles")}
    >
      {cardsData.map(
        ({ id, heading, description, imgSrc, imgAlt, webpSourceSetStr }) => {
          return (
            <Stack className={cx("card")} key={id}>
              <h2 className={cx("heading")}>{heading}</h2>
              <Text className={cx("description-p")}>{description}</Text>
              <Flex className={cx("image-container")}>
                <picture>
                  <source type="image/webp" srcSet={webpSourceSetStr} />
                  <img
                    className={cx("card-image")}
                    src={imgSrc}
                    alt={imgAlt}
                    loading="lazy"
                  />
                </picture>
              </Flex>
            </Stack>
          );
        },
      )}
    </Flex>
  );
}

export default Section4;
