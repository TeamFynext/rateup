import styles from "./InteractiveSolutionDescriptions.module.css";
import { Carousel } from "@mantine/carousel";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import DescriptionsCarouselSlides from "../DescriptionsCarouselSlides";
import { Flex } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export type Solution = {
  heading: string;
  description: string;
  imageUrl: string;
};

type InteractiveSolutionDescriptionsProps = {
  solutions: Solution[];
};

function InteractiveSolutionDescriptions({
  solutions,
}: InteractiveSolutionDescriptionsProps) {
  const slidesRef = useRef<null | Map<number, HTMLElement>>(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);

  const isViewPortLeq500px = useMediaQuery("(max-width: 500px)");

  const stateCopyRef = useRef({
    activeSlideIndex: null,
    imageCarousalEmblaInstance: null,
  });

  const setImageCarousalEmblaInstance = useCallback((emblaInstance) => {
    stateCopyRef.current.imageCarousalEmblaInstance = emblaInstance;
  }, []);

  const scrollToActiveIndexImageSlide = useCallback(() => {
    const { imageCarousalEmblaInstance, activeSlideIndex } =
      stateCopyRef.current;
    if (imageCarousalEmblaInstance) {
      // console.log(activeSlideIndex);
      imageCarousalEmblaInstance.scrollTo(activeSlideIndex);
    }
  }, []);

  const handleDescriptonsCarouselSlideChange = useCallback((index) => {
    if (index < slidesRef.current.size - 1) {
      setActiveSlideIndex(index + 1);
      stateCopyRef.current.activeSlideIndex = index + 1;
    } else {
      setActiveSlideIndex(0);
      stateCopyRef.current.activeSlideIndex = 0;
    }
    scrollToActiveIndexImageSlide();
  }, []);

  return (
    <Flex className={styles["solutions-container"]}>
      <div className={styles["descriptions-container"]}>
        <Carousel
          // withIndicators
          className="descriptions-carousel"
          orientation="vertical"
          height={"43.75rem"}
          slideSize="33.333333%"
          slideGap="md"
          loop
          align="start"
          slidesToScroll={1}
          onSlideChange={handleDescriptonsCarouselSlideChange}
          draggable={false}
          classNames={styles}
        >
          <DescriptionsCarouselSlides
            solutions={solutions}
            activeSlideIndex={activeSlideIndex}
            slidesRef={slidesRef}
          />

          <DescriptionsCarouselSlides
            solutions={solutions}
            activeSlideIndex={activeSlideIndex}
            slidesRef={slidesRef}
            copySlides
          />
        </Carousel>
      </div>

      <div className={styles["image-container"]}>
        <Carousel
          orientation="vertical"
          height={isViewPortLeq500px ? "25rem" : "43.75rem"}
          align="start"
          loop
          getEmblaApi={setImageCarousalEmblaInstance}
          initialSlide={1}
          withControls={false}
          draggable={false}
          classNames={styles}
          slideGap={"sm"}
        >
          {
            // Doing concat for displaying copy slides(for displaying carousel in loop).
            solutions.concat(solutions).map((solution, i) => {
              let key = solution.heading;
              if (i >= solutions.length) key = solution.heading + "x";
              return (
                <Carousel.Slide key={key}>
                  <Image
                    src={solution.imageUrl}
                    alt={`${solution.heading}`}
                    width={500}
                    height={500}
                    priority={false}
                  />
                </Carousel.Slide>
              );
            })
          }
        </Carousel>
      </div>
    </Flex>
  );
}

export default InteractiveSolutionDescriptions;
