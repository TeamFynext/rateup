import React, { MutableRefObject } from "react";
import { Image, Text, Title } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import styles from "./DescriptionsCarouselSlides.module.css";
import { motion } from "framer-motion";
import { Solution } from "../../../pages/Reputation/constants";
import { lexend400 } from "../../../../../utils/fonts";

type DescriptionsCarouselProps = {
  solutions: Solution[];
  activeSlideIndex: number | null;
  slidesRef: MutableRefObject<Map<number, HTMLElement>>;
  copySlides?: boolean;
};

function getMap(slidesRef: MutableRefObject<Map<number, HTMLElement>>) {
  if (!slidesRef.current) {
    // Initialize the Map on first usage.
    slidesRef.current = new Map();
  }
  return slidesRef.current;
}

function DescriptionsCarouselSlides({
  solutions,
  activeSlideIndex,
  slidesRef,
  copySlides = false,
}: DescriptionsCarouselProps) {
  return (
    <>
      {solutions.map(({ heading, description, listIcons }, i) => {
        let index = i;
        if (copySlides) {
          index = i + solutions.length;
        }
        const isSlideActive = activeSlideIndex === index;
        let listIconEnabledIcon: string | undefined,
          listIconDisabledIcon: string | undefined;
        if (listIcons) {
          listIconEnabledIcon = listIcons.enabledIcon;
          listIconDisabledIcon = listIcons.disabledIcon;
        }

        return (
          <Carousel.Slide
            ref={(node) => {
              const map = getMap(slidesRef);
              if (node) {
                map.set(index, node);
              } else {
                map.delete(index);
              }
            }}
            key={heading}
            className={`${isSlideActive ? styles["active-slide"] : ""}`}
          >
            <motion.div
              layout
              className={styles["solution-card"]}
              data-index={index}
              transition={{
                duration: 0.5,
              }}
            >
              <div className={styles["card-content"]}>
                <Title order={2}>
                  {listIcons ? (
                    <div className={styles["list-icon-container"]}>
                      {isSlideActive ? (
                        <Image src={listIconEnabledIcon} alt="list indicator" />
                      ) : (
                        <Image
                          src={listIconDisabledIcon}
                          alt="list indicator"
                        />
                      )}
                    </div>
                  ) : (
                    ""
                    // <div className={styles["list-indicator-circle-container"]}>
                    //   <div className={styles["list-indicator-circle"]}></div>
                    // </div>
                  )}
                  <span>{heading}</span>
                </Title>
                <Text className={isSlideActive ? lexend400.className : ""}>
                  {description}
                </Text>
              </div>
            </motion.div>
          </Carousel.Slide>
        );
      })}
    </>
  );
}

export default DescriptionsCarouselSlides;
