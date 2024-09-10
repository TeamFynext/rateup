import { Carousel } from "@mantine/carousel";
import { Flex, Image, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classNames from "classnames/bind";

import styles from "./CompaniesUsingRateup.module.css";
import { companiesLogosList } from "./logosList";

const cx = classNames.bind(styles);

function CompaniesUsingRateup() {
  const isVpLeq768px = useMediaQuery("(max-width: 768px)");
  return (
    <Stack className={cx("companies-using-rateup-root-div")}>
      <h1 className={cx("heading")}>Top companies using RateUp platform</h1>
      <Flex className={cx("carousel-container")}>
        <Carousel
          className={styles["companies-logos-carousel"]}
          height={isVpLeq768px ? 100 : 120}
          loop
          slideSize={{
            base: "36%",
            xs: "25%",
            sm: "23%",
            lg: "20%",
            xl: "14.28%",
          }}
          classNames={{
            slide: cx("slide"),
            controls: cx("controls"),
            control: cx("control"),
          }}
          dragFree
          initialSlide={3}
        >
          {companiesLogosList.map(({ id, logoUrl, alt }) => {
            return (
              <Carousel.Slide key={id} className={cx("carousel-slide")}>
                <Image className={cx("logo-img")} src={logoUrl} alt={alt} />
              </Carousel.Slide>
            );
          })}
        </Carousel>
      </Flex>
    </Stack>
  );
}

export default CompaniesUsingRateup;
