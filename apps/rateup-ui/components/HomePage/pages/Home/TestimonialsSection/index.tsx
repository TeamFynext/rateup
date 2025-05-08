import { Carousel } from "@mantine/carousel";
import { Flex, Text, Title } from "@mantine/core";

import commonStyles from "../../../index.module.css";
import carouselStyles from "./CarouselStyles.module.css";
import { testimonials } from "./constants";
import TestimonialCard from "./TestimonialCard";
import styles from "./TestimonialsSection.module.css";

function TestimonialsSection() {
  return (
    <Flex className={styles["testimonials-section"]}>
      <Title className={styles["testimonials-section-heading"]}>
        <span className={`${styles["line"]} ${commonStyles["gradient-text"]}`}>
          We prioritise your requirements. That is what drives us forward.{" "}
        </span>
        <span className={styles["love-from-all-over-span"]}>
          Love from all over the world
        </span>
      </Title>

      <Flex className={styles["testimonials-carousel-container"]}>
        <Carousel
          classNames={carouselStyles}
          slideSize={{ base: "270px", xs: "320px" }}
          slideGap={{ base: "sm", xs: "sm", sm: "md", md: "lg" }}
          emblaOptions={{ loop: true, align: "start", slidesToScroll: 1 }}
        >
          {testimonials.map((testimonialObj) => {
            return (
              <Carousel.Slide key={testimonialObj.id}>
                <TestimonialCard testimonialObj={testimonialObj} />
              </Carousel.Slide>
            );
          })}
        </Carousel>
      </Flex>
    </Flex>
  );
}

export default TestimonialsSection;
