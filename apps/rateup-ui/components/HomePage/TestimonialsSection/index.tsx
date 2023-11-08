import { useEffect, useRef, useState } from "react";
import {
  placeAvatarsOnCircle,
  playTestimonials,
  playTestimonialsInterval,
} from "./utils";
import styles from "./TestimonialsSection.module.css";
import commonStyles from "../index/index.module.css";
import TestimonialNodes from "./TestimonialNodes/TestimonialNodes";
import { Flex, Text, Title } from "@mantine/core";
import { useIntersection, useViewportSize } from "@mantine/hooks";

function TestimonialsSection() {
  const outerDiscRef = useRef(null);

  const [popoversState, setPopoverStates] = useState({ outerDisc_id1: true });

  const { ref: intersectionObserverRef, entry } = useIntersection({
    threshold: 0.2,
  });

  const { width } = useViewportSize();

  useEffect(() => {
    if (entry?.isIntersecting) {
      playTestimonials(entry.target, setPopoverStates);
    } else {
      clearInterval(playTestimonialsInterval);
      setPopoverStates({ outerDisc_id1: true });
    }
  }, [entry]);

  useEffect(() => {
    if (outerDiscRef.current) {
      placeAvatarsOnCircle(outerDiscRef.current);
    }
  }, [width]);

  useEffect(() => {
    if (outerDiscRef.current) placeAvatarsOnCircle(outerDiscRef.current);
    return () => {
      clearInterval(playTestimonialsInterval);
    };
  }, []);

  return (
    <Flex className={styles["testimonials-section"]}>
      <Title>
        <Text
          className={`${styles["line"]} ${commonStyles["gradient-text"]}`}
          span
        >
          We prioritise your requirements. That is what drives us forward.{" "}
        </Text>
        <Text className={styles["line"]} inherit span>
          Love from all over the world
        </Text>
      </Title>

      <div className={styles["discs-container"]}>
        <div
          className={`${styles["outer-disc"]} ${styles["disc"]}`}
          ref={(node) => {
            if (node && !outerDiscRef.current) {
              outerDiscRef.current = node;
              intersectionObserverRef(node);
            }
          }}
        >
          <TestimonialNodes
            discName="outerDisc"
            popoversState={popoversState}
          />
          <div className={`${styles["inner-disc"]} ${styles["disc"]}`}>
            <TestimonialNodes
              discName="innerDisc"
              popoversState={popoversState}
            />
            <div className={`${styles["centre-disc"]} ${styles["disc"]}`}>
              <TestimonialNodes
                discName="centreDisc"
                popoversState={popoversState}
              />
            </div>
          </div>
        </div>
      </div>
    </Flex>
  );
}

export default TestimonialsSection;
