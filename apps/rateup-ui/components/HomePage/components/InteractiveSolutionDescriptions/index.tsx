import { useCallback, useEffect, useRef, useState } from "react";
import { Flex } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { useIntersection, useMediaQuery } from "@mantine/hooks";
import DescriptionsCarouselSlides from "./DescriptionsCarouselSlides";
import styles from "./InteractiveSolutionDescriptions.module.css";
import { Solution } from "../../pages/Reputation/constants";

type InteractiveSolutionDescriptionsProps = {
  solutions: Solution[];
  imageContainerAsFirstElement?: boolean;
  imageContainerImageUrl?: string;
};

function InteractiveSolutionDescriptions({
  solutions,
  imageContainerAsFirstElement,
  imageContainerImageUrl,
}: InteractiveSolutionDescriptionsProps) {
  const slidesRef = useRef<null | Map<number, HTMLElement>>(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);

  const isViewPortLeq500px = useMediaQuery("(max-width: 500px)");

  const { ref: intersectionObserverRef, entry } = useIntersection({
    threshold: 0,
  });

  const descriptionsCarousalRef = useRef(null);

  const autoplay = useRef(Autoplay({ delay: 4000 }));

  const variableValues = useRef({
    activeSlideIndex: null,
    imageCarousalEmblaInstance: null,
    autoplayInterval: null,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      autoplay.current?.play();
    } else {
      clearInterval(variableValues.current.autoplayInterval);
      autoplay.current?.stop();
    }
  }, [entry]);

  const setImageCarousalEmblaInstance = useCallback((emblaInstance) => {
    variableValues.current.imageCarousalEmblaInstance = emblaInstance;
  }, []);

  const scrollToActiveIndexImageSlide = useCallback(() => {
    if (imageContainerImageUrl) return;
    const { imageCarousalEmblaInstance, activeSlideIndex } =
      variableValues.current;
    if (imageCarousalEmblaInstance) {
      imageCarousalEmblaInstance.scrollTo(activeSlideIndex);
    }
  }, []);

  const handleDescriptonsCarouselSlideChange = useCallback((index) => {
    if (index < slidesRef.current.size - 1) {
      setActiveSlideIndex(index + 1);
      variableValues.current.activeSlideIndex = index + 1;
    } else {
      setActiveSlideIndex(0);
      variableValues.current.activeSlideIndex = 0;
    }
    scrollToActiveIndexImageSlide();
  }, []);

  useEffect(() => {
    const descriptionsCarouselRootElement = descriptionsCarousalRef.current;
    let controls = [];
    const onControlClick = (e) => {
      autoplay.current?.stop();
    };
    if (descriptionsCarouselRootElement) {
      controls = descriptionsCarouselRootElement.querySelectorAll(
        ".mantine-Carousel-control",
      );
      controls.forEach((control, index) => {
        control.addEventListener("click", onControlClick);
      });
    }
    return () => {
      controls.forEach((control, index) => {
        control.removeEventListener("click", onControlClick);
      });
    };
  }, [descriptionsCarousalRef.current]);

  useEffect(() => {
    return () => autoplay.current?.destroy();
  }, []);

  return (
    <Flex
      className={`
          ${styles["solutions-container"]}
          ${
            imageContainerAsFirstElement
              ? styles["image-container-as-first-element"]
              : ""
          }
        `}
    >
      <div
        ref={intersectionObserverRef}
        className={styles["descriptions-container"]}
      >
        <Carousel
          // withIndicators
          className="descriptions-carousel"
          orientation="vertical"
          height={"40rem"}
          slideSize="33.333333%"
          slideGap="sm"
          loop
          align="start"
          slidesToScroll={1}
          initialSlide={0}
          onSlideChange={handleDescriptonsCarouselSlideChange}
          draggable={false}
          classNames={styles}
          plugins={[autoplay.current]}
          onMouseEnter={autoplay.current.stop}
          onMouseLeave={() => autoplay.current.play()}
          speed={5}
          ref={descriptionsCarousalRef}
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
          speed={5}
        >
          {imageContainerImageUrl ? (
            <Carousel.Slide>
              <Image
                src={imageContainerImageUrl}
                alt={"Illustration"}
                width={500}
                height={500}
                priority={false}
              />
            </Carousel.Slide>
          ) : (
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
          )}
        </Carousel>
      </div>
    </Flex>
  );
}

export default InteractiveSolutionDescriptions;
