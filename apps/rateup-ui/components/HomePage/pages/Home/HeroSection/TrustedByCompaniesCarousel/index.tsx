import { Carousel, CarouselSlide } from "@mantine/carousel";
import { companiesLogosList } from "../constants";
import { Box, Image } from "@mantine/core";
import styles from "./TrustedByCompaniesCarousel.module.css";
import classNames from "classnames/bind";
import { useMediaQuery } from "@mantine/hooks";
const cx = classNames.bind(styles);

function TrustedByCompaniesCarousel() {
  const isVPLeq768px = useMediaQuery("(max-width: 768px)");

  return (
    <Box className={cx("carousel-container")}>
      <Carousel
        height={isVPLeq768px ? 100 : 175}
        slideSize={{ base: "33.333333%", xs: "33.333333%", sm: "23%" }}
        slideGap={"md"}
        loop
        classNames={{
          slide: cx("slide"),
          controls: cx("controls"),
          control: cx("control"),
        }}
        initialSlide={3}
        withControls
      >
        {companiesLogosList.map(({ id, logoUrl, alt }) => {
          return (
            <CarouselSlide key={id}>
              <Image
                className={cx("logo-img")}
                src={logoUrl}
                alt={alt}
                fit="contain"
              />
            </CarouselSlide>
          );
        })}
      </Carousel>
    </Box>
  );
}

export default TrustedByCompaniesCarousel;
