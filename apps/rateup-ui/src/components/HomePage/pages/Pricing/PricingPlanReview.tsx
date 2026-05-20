"use client";

import { Rating, Stack, Text, Title } from "@mantine/core";
import { motion } from "motion/react";

import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel.tsx";

const reviews = [
  {
    title: "",
    author: "Sajesh Nair",
    position: "Training & Business Development Manager, Linnk Academy India",
    company: "",
    description:
      "Thank you to the Rateup team for supporting my team in reaching our target customers through your app. The platform is user-friendly and provides an efficient way to follow up with customers. While I have used several similar apps, I find Rateup to be more reliable and easier to use. I highly recommend it. Thank you once again for your excellent service.",
  },
  {
    title: "",
    author: "Sanjay Krishna H",
    position: "Senior Product Manager, Entri",
    description:
      "We were struggling with getting feedback from users and that is when Rateup came in. We were able to try out different templates, send out campaigns to segments of users and view the feedback in a single dashboard. Would recommend Rateup majorly for their whatsapp based flows. The Rateup team provides great support and prompt updates which is a cherry on top!",
  },
  {
    title: "",
    author: "Mithun Mathew",
    position: "Senior Product Manager, Eduport",
    description:
      "The support from the Rateup team was fantastic! I believe a great product needs a strong support network, and they delivered just that. They were kind enough to add new features within a limited timeframe, which was very impressive.",
  },
];

export const PricingPlanReview = () => {
  const quote = <span className="font-bold">"</span>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="flex flex-col justify-center items-center h-[100%] py-4"
    >
      <Title ta={"center"} c="white" order={3} mb={"lg"}>
        Why People Love Us
      </Title>
      <PaperLayout
        shadow="lg"
        className="bg-gray-50"
        p={0}
        py={"lg"}
        w={{ base: 350, xs: "90%", sm: "80%" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <Carousel
            opts={{ loop: true, align: "start", slidesToScroll: 1 }}
            className="w-full"
          >
            <CarouselContent>
              {reviews.map((review, index) => (
                <CarouselItem key={index} className="px-15">
                  <Stack justify="center" align="center" gap={"xs"}>
                    <Rating value={5} />
                    <p className="text-sm italic">
                      {quote} {review.description} {quote}
                    </p>
                    <Stack gap={0} p={0} justify="center" align="center">
                      <Text fw={500} size="sm">
                        {review.author}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {review.position}
                      </Text>
                    </Stack>
                  </Stack>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </motion.div>
      </PaperLayout>
    </motion.div>
  );
};
