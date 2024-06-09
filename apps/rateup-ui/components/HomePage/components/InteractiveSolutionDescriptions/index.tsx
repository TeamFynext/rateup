import { Button, Flex } from "@mantine/core";
import { useIntersection, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { useKeenSlider } from "keen-slider/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Solution } from "../../pages/Reputation/constants";
import MobileInteractiveSolutionDescriptions from "../MobileInteractiveSolutionDescriptions";
import DescriptionsCarouselSlides from "./DescriptionsCarouselSlides";
import styles from "./InteractiveSolutionDescriptions.module.css";

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselLoaded, setIsCarouselLoaded] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider(
    {
      initial: 0,
      vertical: true,
      loop: true,
      slides: {
        perView: 3,
        spacing: 16,
      },
      defaultAnimation: {
        duration: 600,
        easing: (t) => t,
      },
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel);
      },
      created() {
        setIsCarouselLoaded(true);
        nextTimeout();
      },
    },
    [
      (slider) => {
        slider.on("dragStarted", clearNextTimeout);
        slider.on("animationEnded", nextTimeout);
        slider.on("updated", nextTimeout);
      },
    ],
  );

  const carouselTimeoutRef = useRef(null);
  const carouselMouseoverRef = useRef(null);
  function clearNextTimeout() {
    clearTimeout(carouselTimeoutRef.current);
  }
  function nextTimeout() {
    clearTimeout(carouselTimeoutRef.current);
    if (carouselMouseoverRef.current) return;
    carouselTimeoutRef.current = setTimeout(() => {
      instanceRef.current?.next();
    }, 4000);
  }

  useEffect(() => {
    if (currentSlide < 8) {
      setActiveSlideIndex(currentSlide + 1);
    } else {
      setActiveSlideIndex(0);
    }
  }, [currentSlide]);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);

  const { ref: intersectionObserverRef, entry } = useIntersection({
    threshold: 0.25,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      nextTimeout();
    } else {
      clearNextTimeout();
    }
  }, [entry]);

  const isViewportLeq768px = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isViewportLeq768px) {
      clearNextTimeout();
    } else {
      instanceRef.current?.moveToIdx(0);
      setActiveSlideIndex(1);
      nextTimeout();
    }
  }, [isViewportLeq768px]);

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
          <MobileInteractiveSolutionDescriptions
            solutions={solutions}
            setActiveSlideIndex={setActiveSlideIndex}
          />
        ) : (
          <div
            className={styles["descriptions-carousel-wrapper"]}
            onMouseOver={() => {
              carouselMouseoverRef.current = true;
              clearNextTimeout();
            }}
            onMouseOut={() => {
              carouselMouseoverRef.current = false;
              nextTimeout();
            }}
          >
            <div
              className={`keen-slider ${styles["descriptions-carousel"]}`}
              ref={sliderRef}
              style={{ height: "39.5rem" }}
            >
              <DescriptionsCarouselSlides
                solutions={solutions}
                activeSlideIndex={activeSlideIndex}
              />
              <DescriptionsCarouselSlides
                solutions={solutions}
                activeSlideIndex={activeSlideIndex}
                copySlides
              />
              <DescriptionsCarouselSlides
                solutions={solutions}
                activeSlideIndex={activeSlideIndex}
                copySlides2nd
              />
            </div>
            {isCarouselLoaded && instanceRef.current && (
              <div className={styles["hidden-prev-next-btn-container"]}>
                <Button
                  className={`${styles["prev-slide-btn"]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    instanceRef.current?.prev();
                  }}
                ></Button>
                <Button
                  className={`${styles["next-slide-btn"]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    instanceRef.current?.next();
                  }}
                ></Button>
              </div>
            )}
          </div>
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
