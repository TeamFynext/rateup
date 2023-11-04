import React, { useState } from "react";
import { Grid, SimpleGrid, Center, Image, Skeleton } from "@mantine/core";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { useForm } from "@mantine/form";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../input/TeamSelector";
import Heading from "../../styled/Heading/Heading";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { useUpdateMenuMutation } from "../../../backend/menu/menu.query";
import { useFileUpload } from "../hook/fileUpload";
import { useSurveysByTeam } from "../../../backend/surveys/surveys.query";
import CenteredSpinner from "../../Loaders/CenteredSpinner";

const GeneralSettings = ({ editingItem }) => {
  const form = useForm({
    initialValues: editingItem || {
      name: "",
      displayName: "",
      locationUrl: "",
      locationText: "",
      websiteUrl: "",
      websiteText: "",
      logo: "",
      backgroundImage: "",
      teamId: "",
      surveyId: "",
    },
    validate: {
      name: (value) => (value?.trim().length ? null : "Cannot be empty"),
      displayName: (value) => (value?.trim().length ? null : "Cannot be empty"),
      locationText: (value) =>
        value?.trim().length ? null : "Cannot be empty",
      teamId: (value) => (value?.trim().length ? null : "select a team"),
    },
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const { isUploading: isLogoUploading } = useFileUpload(logo, "logo", form);
  const { isUploading: isBackgroundImageUploading } = useFileUpload(
    backgroundImage,
    "backgroundImage",
    form
  );
  const { isPending, error, mutate } = useUpdateMenuMutation(
    editingItem?.id,
    () => {},
    () => {}
  );
  const { data: surveys = [], isPending: surveyIsPending } = useSurveysByTeam(
    form?.values?.teamId,
    !!form?.values?.teamId
  );

  if (surveyIsPending) return <CenteredSpinner />;

  const surveyFormatedData = surveys?.map((survey) => ({
    value: survey.id,
    label: survey.title,
  }));
  const onSubmit = (values: any) => {
    mutate({
      menuId: editingItem?.id,
      updatedData: values,
    });
  };
  return (
    <PaperLayout>
      <form onSubmit={form.onSubmit(onSubmit)} style={{ gap: "20px" }}>
        <Heading subtitle="General settings" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TeamSelector
            placeholder="Select Team"
            label="Team"
            withAsterisk
            defaultValue={editingItem?.teamId}
            allowDeselect={false}
            disabled={isPending}
            {...form.getInputProps("teamId")}
          />
          <ContainedTextField
            label="Menu Name"
            placeholder="Menu 1"
            withAsterisk
            {...form.getInputProps("name")}
          />
          <ContainedTextField
            label="Display Name"
            placeholder="Paragon Restaurant"
            withAsterisk
            {...form.getInputProps("displayName")}
          />
          <SimpleGrid cols={2} spacing="md">
            <ContainedTextField
              label="Location Label"
              withAsterisk
              placeholder="Kannur Rd, near CH Over bridge"
              {...form.getInputProps("locationText")}
            />
            <ContainedTextField
              label="Location URL"
              placeholder="https://goo.gl/maps/xyz1234"
              {...form.getInputProps("locationUrl")}
            />
          </SimpleGrid>
          <Grid>
            <Grid.Col span={6}>
              <ContainedTextField
                label="Website Label"
                placeholder="paragonHotels.in"
                {...form.getInputProps("websiteText")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <ContainedTextField
                label="Website URL"
                placeholder="https://paragonHotels.in"
                {...form.getInputProps("websiteUrl")}
              />
            </Grid.Col>

            <Grid.Col>
              <ContainedSelection
                withAsterisk
                label="choose a survey to display in the menu pagel"
                placeholder={
                  surveyFormatedData?.length === 0
                    ? "There is no published survay"
                    : "Select survey"
                }
                disabled={surveyFormatedData?.length === 0}
                required
                data={surveyFormatedData}
                {...form.getInputProps("surveyId")}
              />
            </Grid.Col>
          </Grid>
          <SimpleGrid cols={2} spacing="md">
            <ContainedFileInput
              label="Upload Logo"
              placeholder="Click here to upload"
              accept="image/*"
              multiple={false}
              error={form?.errors?.logo && form?.errors?.logo}
              onChange={setLogo}
            />
            <Center>
              {isLogoUploading ? (
                <Skeleton w={50} h={50} />
              ) : (
                <Image
                  w={50}
                  h={50}
                  src={
                    form?.values?.logo
                      ? getFileUrlFromKey(form?.values?.logo)
                      : editingItem?.logo
                      ? getFileUrlFromKey(editingItem?.logo)
                      : ""
                  }
                />
              )}
            </Center>
            <ContainedFileInput
              label="Upload background image"
              placeholder="Click here to upload"
              accept="image/*"
              multiple={false}
              error={
                form?.errors?.backgroundImage && form?.errors?.backgroundImage
              }
              onChange={setBackgroundImage}
            />

            <Center>
              {isBackgroundImageUploading ? (
                <Skeleton w={50} h={50} />
              ) : (
                <Image
                  w={50}
                  h={50}
                  src={
                    form?.values?.backgroundImage
                      ? getFileUrlFromKey(form?.values?.backgroundImage)
                      : editingItem?.backgroundImage
                      ? getFileUrlFromKey(editingItem?.backgroundImage)
                      : ""
                  }
                />
              )}
            </Center>
          </SimpleGrid>
        </SimpleGrid>
        <Grid justify="flex-end" mt={"md"}>
          <Grid.Col span={2}>
            <RateupButtonPrimary
              type="submit"
              loading={isPending}
              title="Save Changes"
            />
          </Grid.Col>
          <Grid.Col span={5}></Grid.Col>
        </Grid>
      </form>
    </PaperLayout>
  );
};

export default GeneralSettings;
