import { createFileRoute, useSearch } from "@tanstack/react-router";

import type { CollectionTestimonial } from "@/backend/testimonials/testimonial.api";
import { getAllTestimonialsByCollection } from "@/backend/testimonials/testimonial.api";
import TestimonialCard from "@/components/testimonial/TestimonialCard.tsx";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { rateupLogoOg } from "@/utils/constants.ts";

export const Route = createFileRoute("/(public-facing)/public/testimonial/$collectionId/")({
  component: Collections,
  loader: ({ params }) => getAllTestimonialsByCollection(params.collectionId),
  head: ({ params, loaderData }) => {
    const collectionName = loaderData?.name ?? "";
    const collectionId = loaderData?.id ?? params.collectionId;

    return {
      meta: [
        // Must be a `meta` entry — TanStack ignores a top-level `title` key, so this page
        // rendered the root default title.
        { title: `Rateup - Testimonial ${collectionName}` },
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
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
          content: rateupLogoOg,
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
      return <Spinner />;
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
            {collection.testimonials.map((testimonial: CollectionTestimonial) => (
              <CarouselItem key={testimonial.id} className="basis-67.5 xs:basis-80 pl-4 py-2">
                <TestimonialCard testimonial={testimonial} currentStyle={collection.theme} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {collection.testimonials.map((testimonial: CollectionTestimonial) => (
          <TestimonialCard
            testimonial={testimonial}
            currentStyle={collection.theme}
            key={testimonial.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center bg-transparent m-8">{renderContent()}</div>
  );
}
