import React from "react";
import { Grid, SimpleGrid } from "@mantine/core";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { useForm } from "@mantine/form";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../input/TeamSelector";
import Heading from "../../styled/Heading/Heading";
import { useUpdateMenuMutation } from "../../../backend/menu/menu.query";
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
      teamId: "",
      surveyTeamMapId: "",
    },
    validate: {
      name: (value) => (value?.trim().length ? null : "Cannot be empty"),
      displayName: (value) => (value?.trim().length ? null : "Cannot be empty"),
      teamId: (value) => (value?.trim().length ? null : "select a team"),
    },
  });

  const { isPending, error, mutate } = useUpdateMenuMutation(
    editingItem?.id,
    () => {},
    () => {},
  );
  const { data: surveys = [], isPending: surveyIsPending } = useSurveysByTeam(
    form?.values?.teamId,
    !!form?.values?.teamId,
  );

  if (surveyIsPending) return <CenteredSpinner />;

  const surveyFormatedData = surveys?.map((survey) => ({
    value: survey.surveyTeamMapId,
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
            placeholder="Hotel Name"
            withAsterisk
            {...form.getInputProps("displayName")}
          />
          <SimpleGrid cols={2} spacing="md">
            <ContainedTextField
              label="Location Label"
              placeholder="Kannur Rd, near CH Over bridge"
              {...form.getInputProps("locationText")}
            />
            <ContainedTextField
              label="Location URL"
              placeholder="https://goo.gl/maps/xyz1234"
              {...form.getInputProps("locationUrl")}
              type="url"
            />
          </SimpleGrid>
          <ContainedSelection
            label="Choose a survey to display in the menu pagel"
            placeholder={
              surveyFormatedData?.length === 0
                ? "There is no published survay"
                : "Select survey"
            }
            disabled={surveyFormatedData?.length === 0}
            required
            allowDeselect={false}
            data={surveyFormatedData}
            {...form.getInputProps("surveyTeamMapId")}
          />
          <SimpleGrid cols={2} spacing="md">
            <ContainedTextField
              label="Website Label"
              placeholder="hotelname.in"
              {...form.getInputProps("websiteText")}
            />
            <ContainedTextField
              label="Website URL"
              placeholder="https://hotelname.in"
              type="url"
              {...form.getInputProps("websiteUrl")}
            />
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
