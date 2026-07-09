import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  useGetAllTestimonialsByCollection,
  useGetAllTestimonialsByOrg,
} from "@/backend/testimonials/testimonial.query";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { filterType } from "@/routes/dashboard/testimonial/$collectionId/index.tsx";
import { getFilteredTestimonials } from "@/utils/testimonial.ts";

import NothingFound from "../NothingFound/NothingFound.tsx";
import TestimonialCard from "./TestimonialCard.tsx";

import classes from "./testimonial.module.css";

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
  const { data: alltestimonials, isLoading: isTestimonialLoading } = useGetAllTestimonialsByOrg();
  const filteredTestimonials = getFilteredTestimonials(alltestimonials, filters, type);
  const { t: translations } = useTranslation();
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  function checkIfTestimonialIdsAreIncludedInAllTestimonials(idtocheck: string) {
    const esistingtestimonialIds = collection?.testimonials.map((t) => t.id);
    return esistingtestimonialIds?.includes(idtocheck);
  }
  if (isTestimonialLoading) return <Spinner />;
  if (filteredTestimonials?.length <= 0)
    return (
      <div className="flex items-center justify-center mt-37.5">
        <NothingFound text={translations("No testimonials found")} />
      </div>
    );
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          {filteredTestimonials?.map((testimonial, _index) => {
            const isSelected = selectedTestimonialIds?.some((t) => t === testimonial?.id);
            return (
              <div className={classes.root} key={testimonial?.id}>
                <Checkbox
                  className={classes.checkboxWrapper}
                  checked={
                    isSelected || checkIfTestimonialIdsAreIncludedInAllTestimonials(testimonial?.id)
                  }
                  disabled={checkIfTestimonialIdsAreIncludedInAllTestimonials(testimonial?.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedTestimonialIds((prev) => [...prev, testimonial?.id]);
                    else
                      setSelectedTestimonialIds((prev) =>
                        prev?.filter((t) => t !== testimonial?.id),
                      );
                  }}
                  tabIndex={-1}
                />
                <TestimonialCard testimonial={testimonial} />
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};

export default TestimonialSelect;
