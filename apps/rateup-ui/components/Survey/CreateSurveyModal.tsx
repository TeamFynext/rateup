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
import { getTeamsByUser } from "../../backend/team/team.api";
import { useCreateSurveyMutation } from "../../backend/surveys/surveys.query";
import { IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState} from 'react'

interface FormValues {
  title: string;
  languages: Array<string>;
  teamId: string;
  type: string;
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);
export function CreateSurveyModal({ open, close, surveyType }) {
  const {
    isError,
    isLoading,
    data: teams,
  } = useQuery(["teamsByUser"], getTeamsByUser);

  let teamSelectData = teams?.data?.data?.map((team) => ({
    value: team.teamId,
    label: team.teamName,
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
      languages: [],
      teamId: null,
      type: surveyType ? surveyType : "web",
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      languages: (values) =>
        values.length ? null : "Must contain atleast one language",
      teamId: (value) => (value ? null : "Must select a team"),
      type: (value) => (value ? null : "Must select a type"),
    },
  });

  const resetForm = () => {
    form.reset()
  }
  const [isCreating, setIsCreating] = useState(false);

  const createSurveyMutation = useCreateSurveyMutation({ close, resetForm, setIsCreating });

  const onSubmit = (e) => {
    e.preventDefault();
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true)
    notifications.show({
      id: 'load-data',
      loading: true,
      title: 'Creating survey..',
      message: `Hold on, your survey is getting created...`,
      autoClose: false,
      withCloseButton: false,
  });
    createSurveyMutation.mutate(form.values);
    
  };
  if (isLoading) {
    return null;
  }
  if (isError || !teams?.data?.data) {
    // TODO: Handle error
    // throw new Error("Failed to load teams");
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
      title="Create Survey"
      centered
      styles={{
        title: {
          fontSize: '25px',
          fontWeight: 700,
          padding: "10px"
        }}}
    >
      <FormProvider form={form} >
        <form onSubmit={onSubmit}>
          <Stack sx={{ minHeight: "300px"}} mt="xl">
            <TextInput
              placeholder="Enter title"
              label="Title"
              withAsterisk
              {...form.getInputProps("title")}
            />
            <MultiSelect
              withAsterisk
              label="Languages"
              placeholder="Type to create new language"
              searchable
              creatable
              maxDropdownHeight="110"
              // TODO: Add a user-level language list
              data={Array.from(Languages)}
              getCreateLabel={(query) => `+ Create ${query}`}
              //@ts-ignore
              onCreate={(query) => {
                if (form.values.languages.includes(query)) return;
                form.setFieldValue("languages", [
                  ...form.values.languages,
                  query,
                ]);
                Languages.add(query);
              }}
              {...form.getInputProps("languages")}
            />

            <Select
              label="Team"
              placeholder="Select team"
              data={teamSelectData}
              withAsterisk
              maxDropdownHeight={110}
              {...form.getInputProps("teamId")}
            />
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
