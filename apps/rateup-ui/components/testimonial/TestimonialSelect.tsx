import { Checkbox, Flex, Grid, Loader, SimpleGrid, Stack } from "@mantine/core";
import TestimonialCard from "./TestimonialCard";
import { RateupButtonBlue } from "../Button/RateupButtons";
import { useListState } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useGetAllTestimonials } from "../../backend/testimonials/testimonial.query";
import { TestimonialTabs } from "../../pages/dashboard/testimonial/[surveyId]";

const TestimonialSelect = ({
  survey,
  setActiveTab,
  selectedTestimonials,
  selectedTestimonialHandler,
}) => {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  console.log("selectedTestimonials", selectedTestimonials);
  const { data: testimonials, isLoading } = useGetAllTestimonials(surveyId);
  console.log("testimonials", testimonials);
  const isAllSelected = testimonials === selectedTestimonials;
  //get testimonials from testimonials using surveyTeamMapId
  //get surveyTeamMapid from

  const handleNext = () => {
    setActiveTab(TestimonialTabs.Edit);
  };
  if (isLoading) return <Loader />;
  return (
    <Stack>
      <Grid columns={12}>
        <Grid.Col span={4}></Grid.Col>
        <Grid.Col span={4}>
          <Flex justify={"center"} align={"center"}>
            <Checkbox
              checked={isAllSelected}
              onChange={(e) => {
                if (e.currentTarget.checked)
                  selectedTestimonialHandler.setState(testimonials);
                else selectedTestimonialHandler.setState([]);
              }}
              label={isAllSelected ? "Deselect All" : "Select All"}
              size="lg"
              radius={"xl"}
              pl={"xl"}
            />
          </Flex>
        </Grid.Col>
        <Grid.Col span={4}>
          <Flex justify={"flex-end"}>
            <RateupButtonBlue color="black" title="Next" onClick={handleNext} />
          </Flex>
        </Grid.Col>
      </Grid>

      <SimpleGrid cols={3} mt={"lg"}>
        {testimonials?.map((testimonial, index) => {
          const isSelected = selectedTestimonials.some(
            (t) => t?.id === testimonial?.id,
          );
          console.log("isSelected", isSelected);
          return (
            <Stack pos={"relative"}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    selectedTestimonialHandler.append(testimonial);
                  } else {
                    const tIndex = selectedTestimonials?.findIndex(
                      (t) => t?.id === testimonial?.id,
                    );
                    selectedTestimonialHandler.remove(tIndex);
                  }
                }}
                size="lg"
                radius={"xl"}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  transform: "translate(50%, -50%)", // Center the button in the top right corner
                }}
              />
              <TestimonialCard testimonial={testimonial} />
            </Stack>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
};

export default TestimonialSelect;
