import styles from "./InteractiveSolutionDescriptions.module.css";
import { Carousel } from "@mantine/carousel";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import DescriptionsCarouselSlides from "../DescriptionsCarouselSlides";
import { Flex } from "@mantine/core";
import { useIntersection, useMediaQuery } from "@mantine/hooks";

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

  const { ref:intersectionObserverRef, entry } = useIntersection({
    threshold: 0,
  });

  const variableValues= useRef({
    activeSlideIndex: null,
    imageCarousalEmblaInstance: null,
    descriptionsCarousalEmblaInstance: null,
    autoplayInterval: null
  });

  useEffect(() => {
    if(entry?.isIntersecting) {
      variableValues.current.autoplayInterval = setInterval(() => {
        variableValues.current.descriptionsCarousalEmblaInstance?.scrollNext();
      }, 4000);
    } else {
      clearInterval(variableValues.current.autoplayInterval);
    }
  }, [entry]);

  const setImageCarousalEmblaInstance = useCallback((emblaInstance) => {
    variableValues.current.imageCarousalEmblaInstance = emblaInstance;
  }, []);

  const setDescriptionsCarouselEmblaInstance = useCallback((emblaInstance) => {
    variableValues.current.descriptionsCarousalEmblaInstance = emblaInstance;
  }, []);

  const scrollToActiveIndexImageSlide = useCallback(() => {
    const { imageCarousalEmblaInstance, activeSlideIndex } = variableValues.current;
    if (imageCarousalEmblaInstance) {
      imageCarousalEmblaInstance.scrollTo(activeSlideIndex);
    }
  }, []);

  const handleDescriptonsCarouselSlideChange = useCallback((index) => {

    if(index < slidesRef.current.size - 1) {
      setActiveSlideIndex(index+1);
      variableValues.current.activeSlideIndex = index + 1;
    } else {
      setActiveSlideIndex(0);
      variableValues.current.activeSlideIndex = 0;
    }
    scrollToActiveIndexImageSlide();
  }, []);

  useEffect(() => {
    return () => clearInterval(variableValues.current.autoplayInterval);
  }, []);

  return (
    <Flex 
      className={styles["solutions-container"]}
    >
      <div 
        ref={intersectionObserverRef} 
        className={styles["descriptions-container"]}
      >
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
          initialSlide={0}
          onSlideChange={handleDescriptonsCarouselSlideChange}
          draggable={false}
          classNames={styles}
          getEmblaApi={setDescriptionsCarouselEmblaInstance}
          withControls={false}
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
