import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import { Carousel } from "@mantine/carousel";
import { Flex, Loader, SimpleGrid } from "@mantine/core";

import { useGetAllTestimonialsByCollection } from "../../../backend/testimonials/testimonial.query";
import TestimonialCard from "../../../components/testimonial/TestimonialCard";

const Collections = () => {
  const router = useRouter();
  const { collectionId, isLoading } = router.query;
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);

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
          content={`Testimonial ${collection?.name}`}
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
        {isLoading ? (
          <Loader type="bars" />
        ) : collection?.theme.layout == "horizontal" ? (
          <Carousel
            slideSize={{ base: "270px", xs: "320px" }}
            slideGap={{ base: "md", xs: "sm", sm: "md", md: "lg" }}
            controlsOffset={"xs"}
            w={"100%"}
            emblaOptions={{
              loop: true,
              dragFree: true,
              align: "start",
              slidesToScroll: 1,
            }}
          >
            {collection?.testimonials?.map((testimonial) => {
              return (
                <>
                  <Carousel.Slide key={testimonial.id} p={"sm"}>
                    <TestimonialCard
                      testimonial={testimonial}
                      currentStyle={collection?.theme}
                    />
                  </Carousel.Slide>
                </>
              );
            })}
          </Carousel>
        ) : (
          <SimpleGrid cols={3}>
            {collection?.testimonials?.map((testimonial) => (
              <TestimonialCard
                testimonial={testimonial}
                currentStyle={collection?.theme}
                key={testimonial?.id}
              />
            ))}
          </SimpleGrid>
        )}
      </Flex>
    </>
  );
};

export default Collections;
