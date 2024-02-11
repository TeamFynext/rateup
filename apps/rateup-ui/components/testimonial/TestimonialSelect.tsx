import {
  Center,
  Checkbox,
  Flex,
  Grid,
  Loader,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import TestimonialCard from "./TestimonialCard";
import { RateupButtonBlue } from "../Button/RateupButtons";
import {
  useGetAllTestimonials,
  useUpdateCollection,
} from "../../backend/testimonials/testimonial.query";
import { TestimonialTabs } from "../../pages/dashboard/testimonial/[collectionId]";
import { getFilteredTestimonials } from "../../utils/testimonial";
import { useContext } from "react";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import NothingFound from "../NothingFound/NothingFound";

const TestimonialSelect = ({
  surveyId,
  setActiveTab,
  selectedTestimonials,
  selectedTestimonialHandler,
  filters,
  selectedTeamId,
}) => {
  const { selectedCollectionId } = useContext(
    SelectedTestimonialCollectionContext,
  );
  const { data: testimonials, isLoading } = useGetAllTestimonials(surveyId);
  const filteredTestimonials = getFilteredTestimonials(
    testimonials,
    filters,
    selectedTeamId,
  );
  const isAllSelected = filteredTestimonials?.every(
    (t) => selectedTestimonials?.some((st) => st.id === t.id),
  );

  const updateTestimonialCollection = useUpdateCollection(selectedCollectionId);
  const handleNext = () => {
    const data = {
      testimonialIds: selectedTestimonials.map((t) => t.id),
    };
    updateTestimonialCollection.mutate(
      { data, collectionId: selectedCollectionId },
      {
        onSuccess: () => {
          setActiveTab(TestimonialTabs.Edit);
        },
      },
    );
  };
  if (isLoading) return <Loader />;
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );
  return (
    <Stack>
      <Grid columns={12} h={45}>
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
            <RateupButtonBlue
              color="black"
              title="Save & Next"
              onClick={handleNext}
            />
          </Flex>
        </Grid.Col>
      </Grid>

      <SimpleGrid cols={3} mt={"lg"}>
        {filteredTestimonials?.map((testimonial, index) => {
          const isSelected = selectedTestimonials?.some(
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
