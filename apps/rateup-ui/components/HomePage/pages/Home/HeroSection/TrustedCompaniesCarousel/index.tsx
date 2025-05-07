import { useRef } from "react";

import { Carousel, CarouselSlide } from "@mantine/carousel";
import { Box, Image } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classNames from "classnames/bind";
import Autoplay from "embla-carousel-autoplay";

import { companiesLogosList } from "./logosList";
import styles from "./TrustedCompaniesCarousel.module.css";

const cx = classNames.bind(styles);

function TrustedByCompaniesCarousel() {
  const isVPLeq768px = useMediaQuery("(max-width: 768px)");
  const autoplay: any = useRef(Autoplay({ delay: 2000 }));

  return (
    <Box className={cx("carousel-container")}>
      <Carousel
        height={isVPLeq768px ? 100 : 175}
        slideSize={{ base: "30%", xs: "25%", sm: "23%", lg: "20%", xl: "16%" }}
        slideGap={"md"}
        emblaOptions={{ loop: true, dragFree: true }}
        classNames={{
          slide: cx("slide"),
          controls: cx("controls"),
          control: cx("control"),
        }}
        initialSlide={2}
        withControls={false}
        plugins={[autoplay.current]}
        onMouseEnter={autoplay.current.stop}
        onMouseLeave={autoplay.current.reset}
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
