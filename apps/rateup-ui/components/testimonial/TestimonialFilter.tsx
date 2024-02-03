import { Stack } from "@mantine/core";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { useRouter } from "next/router";
import { useGetAllCollections } from "../../backend/testimonials/testimonial.query";
import { useContext } from "react";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";

const TestimonialFilter = ({
  surveyId,
  selectedCollectionId,
  setSelectedCollection,
}) => {
  const { data: allCollections } = useGetAllCollections(surveyId);
  const collections = allCollections?.map((c) => ({
    value: c?.id,
    label: c?.name,
  }));
  return (
    <Stack>
      <ContainedSelection
        data={collections}
        value={selectedCollectionId}
        onChange={setSelectedCollection}
        placeholder="Your Collections"
      />
    </Stack>
  );
};

export default TestimonialFilter;
