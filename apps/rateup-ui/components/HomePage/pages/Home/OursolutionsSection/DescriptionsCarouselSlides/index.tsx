import React, { MutableRefObject } from "react";

import { Carousel } from "@mantine/carousel";
import { Text, Title } from "@mantine/core";
import { motion } from "motion/react";

import styles from "./DescriptionsCarouselSlides.module.css";

export type Solution = {
  heading: string;
  description: string;
  imageUrl: string;
  listIcons?: {
    enabledIcon: string;
    disabledIcon: string;
  };
  listIcon?: any;
  id: string;
};

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
      {solutions.map((solution, i) => {
        let index = i;
        if (copySlides) {
          index = i + solutions.length;
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
            key={solution.heading}
            className={`${
              activeSlideIndex === index ? styles["active-slide"] : ""
            }`}
          >
            <motion.div
              layout
              className={styles["solution-card"]}
              data-index={index}
              transition={{
                duration: 0.5,
              }}
            >
              <div className={styles["list-indicator-circle-container"]}>
                <div className={styles["list-indicator-circle"]}></div>
              </div>
              <div className={styles["card-content"]}>
                <Title order={2}>{solution.heading}</Title>
                <Text>{solution.description}</Text>
              </div>
            </motion.div>
          </Carousel.Slide>
        );
      })}
    </>
  );
}

export default DescriptionsCarouselSlides;
