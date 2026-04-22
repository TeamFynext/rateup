"use client";

import React from "react";
import Head from "next/head";
import { useParams, useSearchParams } from "next/navigation";

import { Flex, Loader, SimpleGrid } from "@mantine/core";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import { useGetAllTestimonialsByCollection } from "../../../../../backend/testimonials/testimonial.query";
import TestimonialCard from "../../../../../components/testimonial/TestimonialCard";

const Collections = () => {
  const params = useParams();
  const searchParams = useSearchParams();

  const collectionId = params.collectionId as string;
  const isLoading = searchParams.get("isLoading") === "true";
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
            opts={{
              loop: true,
              dragFree: true,
              align: "start",
              slidesToScroll: 1,
            }}
            className="w-full"
          >
            <CarouselContent>
              {collection?.testimonials?.map((testimonial) => (
                <CarouselItem
                  key={testimonial.id}
                  className="basis-[270px] xs:basis-[320px] pl-4 py-2"
                >
                  <TestimonialCard
                    testimonial={testimonial}
                    currentStyle={collection?.theme}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
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
