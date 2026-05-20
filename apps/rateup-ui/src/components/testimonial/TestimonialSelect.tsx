"use client";

import {
  Center,
  Checkbox,
  Group,
  Loader,
  ScrollAreaAutosize,
  Stack,
} from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  useGetAllTestimonialsByCollection,
  useGetAllTestimonialsByOrg,
} from "@/backend/testimonials/testimonial.query";
import type { filterType } from "@/routes/dashboard/testimonial/$collectionId/index.tsx";

import { getFilteredTestimonials } from "@/utils/testimonial.ts";
import NothingFound from "../NothingFound/NothingFound.tsx";
import classes from "./testimonial.module.css";
import TestimonialCard from "./TestimonialCard.tsx";

const TestimonialSelect = ({
  selectedTestimonialIds,
  setSelectedTestimonialIds,
  filters,
  type,
}: {
  selectedTestimonialIds: string[];
  setSelectedTestimonialIds: React.Dispatch<React.SetStateAction<string[]>>;
  filters: filterType;
  type: string;
}) => {
  const params = useParams({
    strict: false,
  });
  const collectionId = params.collectionId as string;
  const { data: alltestimonials, isLoading: isTestimonialLoading } =
    useGetAllTestimonialsByOrg();
  const filteredTestimonials = getFilteredTestimonials(
    alltestimonials,
    filters,
    type,
  );
  const { t: translations } = useTranslation();
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  function checkIfTestimonialIdsAreIncludedInAllTestimonials(
    idtocheck: string,
  ) {
    const esistingtestimonialIds = collection?.testimonials.map((t) => t.id);
    return esistingtestimonialIds?.includes(idtocheck);
  }
  if (isTestimonialLoading) return <Loader />;
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={translations("No testimonials found")} />
      </Center>
    );
  return (
    <ScrollAreaAutosize h={"100%"}>
      <Stack>
        <Group p={"sm"}>
          {filteredTestimonials?.map((testimonial, index) => {
            const isSelected = selectedTestimonialIds?.some(
              (t) => t === testimonial?.id,
            );
            return (
              <div className={classes.root} key={testimonial?.id}>
                <Checkbox
                  classNames={{ root: classes.checkboxWrapper }}
                  checked={
                    isSelected ||
                    checkIfTestimonialIdsAreIncludedInAllTestimonials(
                      testimonial?.id,
                    )
                  }
                  disabled={checkIfTestimonialIdsAreIncludedInAllTestimonials(
                    testimonial?.id,
                  )}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      setSelectedTestimonialIds((prev) => [
                        ...prev,
                        testimonial?.id,
                      ]);
                    else
                      setSelectedTestimonialIds((prev) =>
                        prev?.filter((t) => t !== testimonial?.id),
                      );
                  }}
                  tabIndex={-1}
                  size="md"
                  radius={"xl"}
                />
                <TestimonialCard testimonial={testimonial} />
              </div>
            );
          })}
        </Group>
      </Stack>
    </ScrollAreaAutosize>
  );
};

export default TestimonialSelect;
