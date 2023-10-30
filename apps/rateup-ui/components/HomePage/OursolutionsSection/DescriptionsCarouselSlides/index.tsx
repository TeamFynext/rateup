import React, { MutableRefObject } from "react";
import { Flex, Text, Title } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { Solution } from "../InteractiveSolutionDescriptions";
import styles from "./DescriptionsCarouselSlides.module.css";

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
            <Flex className={styles["solution-card"]} data-index={index}>
              <div className={styles["list-indicator-circle-container"]}>
                <div className={styles["list-indicator-circle"]}></div>
              </div>
              <div className={styles["card-content"]}>
                <Title order={2}>{solution.heading}</Title>
                <Text>{solution.description}</Text>
              </div>
            </Flex>
          </Carousel.Slide>
        );
      })}
    </>
  );
}

export default DescriptionsCarouselSlides;
