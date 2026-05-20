"use client";

import { Flex, Loader, SimpleGrid } from "@mantine/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";

import { getAllTestimonialsByCollection } from "@/backend/testimonials/testimonial.api";
import TestimonialCard from "@/components/testimonial/TestimonialCard.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel.tsx";

export const Route = createFileRoute(
  "/(public-facing)/public/testimonial/$collectionId/",
)({
  component: Collections,
  loader: ({ params }) => getAllTestimonialsByCollection(params.collectionId),
    head: ({ params, loaderData }) => {
      const collectionName = loaderData?.name ?? "";
      const collectionId = loaderData?.id ?? params.collectionId;

      return {
        meta: [
          { charSet: "utf-8" },
          {
            name: "viewport",
            content: "width=device-width, initial-scale=1",
          },
          {
            name: "title",
            content: "gg",
          },
          {
            name: "description",
            content: "Testimonials",
          },
          {
            property: "og:type",
            content: "website",
          },
          {
            property: "og:site_name",
            content: "Rateup",
          },
          {
            property: "og:url",
            content: `https://rateup.app/public/testimonial/${collectionId}`,
          },
          {
            property: "og:title",
            content: `Rateup - Testimonial ${collectionName}`,
          },
          {
            property: "og:description",
            content: `Testimonial ${collectionName}`,
          },
          {
            property: "og:image",
            content: "https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png",
          },
          {
            property: "og:image:type",
            content: "image/png",
          },
          {
            property: "og:image:width",
            content: "1086",
          },
          {
            property: "og:image:height",
            content: "832",
          },
          {
            property: "og:image:alt",
            content: "Star Icon",
          },
        ],
      };
    },
});

function Collections() {
  const searchParams: { isLoading: "true" | "false" } = useSearch({
    strict: false,
  });

  const isLoading = searchParams.isLoading === "true";
  const collection = Route.useLoaderData();
  const renderContent = () => {
    if (isLoading) {
      return <Loader type="bars" />;
    }
    if (collection.theme?.layout === "horizontal") {
      return (
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
            {collection.testimonials.map((testimonial) => (
              <CarouselItem
                key={testimonial.id}
                className="basis-67.5 xs:basis-80 pl-4 py-2"
              >
                <TestimonialCard
                  testimonial={testimonial}
                  currentStyle={collection.theme}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      );
    }
    return (
      <SimpleGrid cols={3}>
        {collection.testimonials.map((testimonial) => (
          <TestimonialCard
            testimonial={testimonial}
            currentStyle={collection.theme}
            key={testimonial.id}
          />
        ))}
      </SimpleGrid>
    );
  };

  return (
    <Flex justify={"center"} align={"center"} m={"xl"} bg={"transparent"}>
      {renderContent()}
    </Flex>
  );
}
