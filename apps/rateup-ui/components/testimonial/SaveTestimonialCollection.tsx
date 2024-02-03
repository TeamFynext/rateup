import { Stack, Text } from "@mantine/core";
import React, { useContext, useState } from "react";
import FormModalLayout from "../Modal/FormModalLayout";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { isNotEmpty, useForm } from "@mantine/form";
import { useCreateTestimonialCollection } from "../../backend/testimonials/testimonial.query";
import { useRouter } from "next/router";

const SaveTestimonialCollection = ({
  opened,
  close,
  selectedTestimonials,
  currentStyle,
}) => {
  const surveyTeamMapId =
    selectedTestimonials[0]?.surveyResponse?.surveyTeamMapId;
  console.log("selectedTestimonials", selectedTestimonials);
  const router = useRouter();
  const { surveyId } = router.query;
  console.log("currentStyle", currentStyle);
  // const { currentStyle } = useContext(SelectedTestimonialCollectionContext)

  const form = useForm({
    initialValues: {
      name: "",
      testimonialIds: [],
      surveyTeamMapId: "",
      theme: null,
    },
    validate: {
      name: isNotEmpty("Name cannot be blank"),
      testimonialIds: isNotEmpty("Select atleast one testimonial"),
    },
  });
  //do using surveyTeamMapId
  const saveCollection = useCreateTestimonialCollection(surveyId);
  const onSubmit = () => {
    const selectedTestimonialIds = selectedTestimonials?.map((c) => c?.id);
    form.values.testimonialIds = selectedTestimonialIds;
    form.values.surveyTeamMapId = surveyTeamMapId;
    form.values.theme = currentStyle;
    if (form.validate().hasErrors) return;
    console.log("form.values", form.values);
    saveCollection.mutate(form.values);
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title="Save Collections"
      centered
      onSubmit={onSubmit}
      buttonTitle="Save"
      includeCancelButton
    >
      <Stack>
        <ContainedTextField
          label="Name your collection"
          {...form.getInputProps("name")}
          placeholder="Enter collection name "
          styles={{
            label: {
              fontWeight: "bold",
              fontSize: "16px",
            },
          }}
        />
        <Text c="red">{form.errors.selectedTestimonials}</Text>
      </Stack>
    </FormModalLayout>
  );
};

export default SaveTestimonialCollection;
