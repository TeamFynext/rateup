import { useCallback, useEffect, useRef, useState } from "react";
import { Flex } from "@mantine/core";
import Image from "next/image";
import { Carousel } from "@mantine/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion, AnimatePresence } from "framer-motion";
import { useIntersection, useMediaQuery } from "@mantine/hooks";
import DescriptionsCarouselSlides from "./DescriptionsCarouselSlides";
import styles from "./InteractiveSolutionDescriptions.module.css";
import { Solution } from "../../pages/Reputation/constants";
import MobileInteractiveSolutionDescriptions from "../MobileInteractiveSolutionDescriptions";

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

  const { ref: intersectionObserverRef, entry } = useIntersection({
    threshold: 0,
  });

  const descriptionsCarousalRef = useRef(null);

  const autoplay = useRef(Autoplay({ delay: 4000 }));

  const isViewportLeq768px = useMediaQuery("(max-width: 768px)");

  const variableValues = useRef({
    activeSlideIndex: null,
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

  const handleDescriptonsCarouselSlideChange = useCallback((index) => {
    if (index < slidesRef.current.size - 1) {
      setActiveSlideIndex(index + 1);
      variableValues.current.activeSlideIndex = index + 1;
    } else {
      setActiveSlideIndex(0);
      variableValues.current.activeSlideIndex = 0;
    }
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
        {isViewportLeq768px ? (
          <MobileInteractiveSolutionDescriptions solutions={solutions} />
        ) : (
          <Carousel
            // withIndicators
            className="descriptions-carousel"
            orientation="vertical"
            height={"40rem"}
            slideSize="33.333333%"
            slideGap={"md"}
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
            speed={8}
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
        )}
      </div>

      <div className={styles["image-container"]}>
        {imageContainerImageUrl ? (
          <Image
            src={imageContainerImageUrl}
            alt={"Illustration"}
            width={500}
            height={500}
            priority={false}
          />
        ) : (
          <AnimatePresence>
            {
              <motion.div
                className={styles["motion-div"]}
                key={activeSlideIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.75 },
                }}
              >
                <Image
                  src={solutions[activeSlideIndex % 3].imageUrl}
                  alt="illustration"
                  width={500}
                  height={500}
                  priority={false}
                />
              </motion.div>
            }
          </AnimatePresence>
        )}
      </div>
    </Flex>
  );
}

export default InteractiveSolutionDescriptions;
