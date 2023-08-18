import {
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
// import { getTeamsByUser } from "../../backend/team/team.api";
// import { useCreateSurveyMutation } from "../../backend/surveys/surveys.query";
import { IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { getSurveys } from "../../../backend/surveys/survey.api";
import { useCreateSurveyLandingPageMutation, useSurveys } from "../../../backend/surveys/surveys.query";
import { getTeamsByUser } from "../../../backend/team/team.api";

interface FormValues {
  title: string;
  surveys: Array<Object>;
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);
export default function CreateSurveyLandingModal({ open, close, surveyType }) {
  const {
    isError,
    isLoading,
    data: surveys,
  } = useQuery(["surveys"], getSurveys);

  console.log(surveys,">>>surveyyysool")
  // let teamSelectData = [];
  let SurveyListData = [];

  if (Array.isArray(surveys)) {
    SurveyListData = surveys;
  }

  let teamSelectData = SurveyListData?.map((survey) => ({
    value: survey.id,
    label: survey.title,
  }));

  //------------type select data -----------
  const typesArray = ["web", "whatsapp"];
  let typeSelectData = typesArray.map((type) => ({
    value: type,
    label: type,
  }));

  const form = useForm({
    initialValues: {
      title: "",
      surveys: [],
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      surveys: (values) =>
        values.length ? null : "Must contain atleast one survey",
    },
  });

  const resetForm = () => {
    form.reset();
  };
  const [isCreating, setIsCreating] = useState(false);
  // console.log(form, ">>>insane form values");
  const createSurveyLandingMutation = useCreateSurveyLandingPageMutation({ close, resetForm, setIsCreating });

  const onSubmit = (e) => {
    e.preventDefault();
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Creating survey Landing page..",
      message: `Hold on, your survey landing page is getting created...`,
      autoClose: false,
      withCloseButton: false,
    });
    createSurveyLandingMutation.mutate(form.values);
  };
  if (isLoading) {
    return null;
  }
  if (isError ) {
    notifications.show({
      id: "load-data",
      color: "red",
      title: "Error",
      message: "Failed Loading teams!",
      icon: <IconX size="1rem" />,
      autoClose: 3000,
    });
  }
  return (
    <Modal
      opened={open}
      onClose={() => {
        close();
        form.reset();
      }}
      title="Create Survey Landing Page"
      centered
    >
      <FormProvider form={form}>
        <form onSubmit={onSubmit}>
          <Stack sx={{ minHeight: "300px" }} mt="xl">
            <TextInput
              placeholder="Enter Landing title"
              label="Title"
              withAsterisk
              {...form.getInputProps("title")}
            />
            <MultiSelect
              withAsterisk
              label="Surveys"
              placeholder="Search surveys"
              searchable
              // creatable
              maxDropdownHeight="110"
              // TODO: Add a user-level language list
              data={teamSelectData}
              // getCreateLabel={(query) => `+ Create ${query}`}
              //@ts-ignore
              // onCreate={(query) => {
              //   if (form.values.languages.includes(query)) return;
              //   form.setFieldValue("languages", [
              //     ...form.values.languages,
              //     query,
              //   ]);
              //   Languages.add(query);
              // }}
              {...form.getInputProps("surveys")}
            />

            {/* <Select
              label="Team"
              placeholder="Select team"
              data={teamSelectData}
              withAsterisk
              maxDropdownHeight={110}
              {...form.getInputProps("teamId")}
            /> */}
            {/* //-----------------survey type ----------- */}
            {!surveyType && (
              <Select
                label="Type"
                placeholder="Select survey type"
                data={typeSelectData}
                withAsterisk
                {...form.getInputProps("type")}
              />
            )}
            <Group position="right" pt="xl" mt="lg">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button variant="filled" type="submit" loading={isCreating}>
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </FormProvider>
    </Modal>
  );
}
