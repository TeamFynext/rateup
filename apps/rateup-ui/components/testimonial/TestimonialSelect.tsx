import {
  Center,
  Checkbox,
  Loader,
  Stack,
  ScrollAreaAutosize,
  Group,
} from "@mantine/core";
import TestimonialCard from "./TestimonialCard";
import { useGetAllTestimonialsByOrg } from "../../backend/testimonials/testimonial.query";
import { filterType } from "../../pages/dashboard/testimonial/[collectionId]";
import { getFilteredTestimonials } from "../../utils/testimonial";
import NothingFound from "../NothingFound/NothingFound";
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
  const { data: alltestimonials, isLoading: isTestimonialLoading } =
    useGetAllTestimonialsByOrg();
  const filteredTestimonials = getFilteredTestimonials(
    alltestimonials,
    filters,
    type,
  );

  if (isTestimonialLoading) return <Loader />;
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );
  return (
    <ScrollAreaAutosize>
      <Stack mah={500}>
        <Group p={"sm"}>
          {filteredTestimonials?.map((testimonial, index) => {
            const isSelected = selectedTestimonialIds?.some(
              (t) => t === testimonial?.id,
            );
            return (
              <div className={classes.root} key={testimonial?.id}>
                <Checkbox
                  classNames={{ root: classes.checkboxWrapper }}
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.currentTarget.checked)
                      setSelectedTestimonialIds((prev) => [
                        ...prev,
                        testimonial?.id,
                      ]);
                    else
                      setSelectedTestimonialIds(
                        (prev) => prev?.filter((t) => t !== testimonial?.id),
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
