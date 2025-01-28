import React from "react";

import { Box, Image, Text, Title } from "@mantine/core";
import { motion } from "motion/react";

import { Solution } from "../../../pages/Reputation/constants";
import styles from "./DescriptionsCarouselSlides.module.css";

type DescriptionsCarouselProps = {
  solutions: Solution[];
  activeSlideIndex: number | null;
  copySlides?: boolean;
  copySlides2nd?: boolean;
};

function DescriptionsCarouselSlides({
  solutions,
  activeSlideIndex,
  copySlides = false,
  copySlides2nd = false,
}: DescriptionsCarouselProps) {
  return (
    <>
      {solutions.map(({ heading, description, listIcon }, i) => {
        let index = i;
        if (copySlides) {
          index = i + solutions.length;
        }
        if (copySlides2nd) {
          index = i + solutions.length + solutions.length;
        }
        const isSlideActive = activeSlideIndex === index;

        return (
          <Box
            key={copySlides ? heading + "_copy" : heading}
            className={`keen-slider__slide ${styles["slide"]} ${isSlideActive ? styles["active-slide"] : ""}`}
          >
            <motion.div
              layout
              className={`${styles["solution-card"]} ${
                isSlideActive ? styles["solution-card-active"] : ""
              }`}
              data-index={index}
              transition={{
                duration: 0.8,
              }}
            >
              <div className={styles["card-content"]}>
                <Title order={2}>
                  <div className={styles["list-icon-container"]}>
                    {listIcon}
                  </div>
                  <span>{heading}</span>
                </Title>
                <Text fw={isSlideActive ? 500 : 400}>{description}</Text>
              </div>
            </motion.div>
          </Box>
        );
      })}
    </>
  );
}

export default DescriptionsCarouselSlides;
