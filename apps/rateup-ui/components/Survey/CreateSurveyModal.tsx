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
import { getTeamsByUser } from "../../api/team/team.api";
import { useCreateSurveyMutation } from "../../api/surveys/surveys.query";

interface FormValues {
  title: string;
  languages: Array<string>;
  teamId: string;
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();

export function CreateSurveyModal({ open, close }) {
  const createSurveyMutation = useCreateSurveyMutation();
  const {
    isError,
    isLoading,
    data: teams,
  } = useQuery(["teamsByUser"], getTeamsByUser);

  let teamSelectData = teams?.data?.data?.map(team => ({
    value: team.teamId,
    label: team.teamName
  }));
  

  const form = useForm({
    initialValues: {
      title: "",
      languages: [],
      teamId: null,
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      languages: (values) =>
        values.length ? null : "Must contain atleast one language",
      teamId: (value) => (value ? null : "Must select a team"),
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }

    createSurveyMutation.mutate(form.values);
  };
  if (isLoading) {
    return null;
  }
  if (isError || !teams.data.data) {
    // TODO: Handle error
    throw new Error("Failed to load teams");
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
    >
      <FormProvider form={form}>
        <form onSubmit={onSubmit}>
          <Stack>
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
              data={["English"]}
              getCreateLabel={(query) => `+ Create ${query}`}
              //@ts-ignore
              onCreate={(query) => {
                throw new Error("Not implemented");
              }}
              {...form.getInputProps("languages")}
            />

            <Select
              label="Team"
              placeholder="Select team"
              data={teamSelectData}
              withAsterisk
              {...form.getInputProps("teamId")}
            />
            <Group position="right" pt="lg">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button variant="filled" type="submit">
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </FormProvider>
    </Modal>
  );
}
