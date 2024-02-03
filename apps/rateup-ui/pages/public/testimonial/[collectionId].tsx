import { useRouter } from "next/router";
import React from "react";
import { useGetAllTestimonialsByCollection } from "../../../backend/testimonials/testimonial.query";
import { TestimonialAlignment } from "../../../types/enums";
import { Carousel } from "@mantine/carousel";
import TestimonialCard from "../../../components/testimonial/TestimonialCard";
import Head from "next/head";
import { Flex } from "@mantine/core";

const Collections = () => {
  const router = useRouter();
  const { collectionId } = router.query;
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  const testimonials = collection?.testimonials?.map((t) => t?.testimonial);
  // const alignment = collection?.theme?.alignment

  return (
    <>
      <Head>
        <title>gg</title>
        <meta name="description" content={`Testimonials`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta
          property="og:url"
          content={`https://rateup.app/public/testimonial/${collection?.id}`}
        />
        <meta
          property="og:title"
          content={`Rateup - Testimonial ${collection?.name}`}
        />
        <meta
          property="og:description"
          content={`Testimonial ${collection?.title}`}
        />
        <meta
          property="og:image"
          content="https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Star Icon" />
      </Head>
      <Flex justify={"center"} align={"center"} m={"xl"} bg={"transparent"}>
        <Carousel
          align="start"
          slideSize={{ base: "270px", xs: "320px" }}
          slideGap={{ base: "md", xs: "sm", sm: "md", md: "lg" }}
          slidesToScroll={1}
          loop
          speed={5}
          controlsOffset={"xs"}
        >
          {testimonials?.map((testimonial) => {
            return (
              <>
                <Carousel.Slide key={testimonial.id}>
                  <TestimonialCard
                    testimonial={testimonial}
                    currentStyle={collection?.theme}
                  />
                </Carousel.Slide>
              </>
            );
          })}
        </Carousel>
      </Flex>
    </>
  );
};

export default Collections;
