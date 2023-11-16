import { Flex, Text, Title } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import TestimonialCard from "./TestimonialCard";
import { testimonials } from "./constants";
import commonStyles from "../index/index.module.css";
import styles from "./TestimonialsSection.module.css";
import carouselStyles from "./CarouselStyles.module.css";

function TestimonialsSection() {
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

      <Flex className={styles["testimonials-carousel-container"]}>
        <Carousel
          align="start"
          classNames={carouselStyles}
          slideSize={{ base: "270px", xs: "320px" }}
          slideGap={{ base: "sm", xs: "sm", sm: "md", md: "lg" }}
          slidesToScroll={1}
          loop
          speed={15}
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
