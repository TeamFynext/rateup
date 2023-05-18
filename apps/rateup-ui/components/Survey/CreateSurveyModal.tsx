import { Button, Group, Modal, MultiSelect, Stack, TextInput } from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { createSurvey } from "../../api/surveys/survey.api";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useQueryClient, useMutation } from "@tanstack/react-query";

interface FormValues {
  title: string,
  languages: Array<string>
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();

export function CreateSurveyModal({open, close}) {

    const queryClient = useQueryClient();
    const createSurveyMutation = useMutation({
      mutationFn: createSurvey,
      onSuccess: () => {
        notifications.show({
          message: "Created!"
        });
        queryClient.invalidateQueries(['surveys']);
        close();
      }
    })
  
const form = useForm({
  initialValues: {
    title: "",
    languages: []
  },
  validate: {
    title: (value) => value.length ? null : "Cannot be empty",
    languages: (values) => values.length? null: "Must contain atleast one language"
  }
})

const onSubmit = (e) => {
  e.preventDefault();
  form.validate()
  if(Object.keys(form.errors).length) {
    console.log(form.errors)
    return
  }
  
  const teamId =  undefined; // replace with a teamId. Goto Teams page to view teamId
  if(!teamId) {
    throw new Error ("TeamId is not defined")
  }
  createSurveyMutation.mutate({...form.values, teamId });
}
  return (
    <Modal opened={open} onClose={() => {close(); form.reset()}} title="Create Survey" centered>
      <FormProvider form={form}>
      <form onSubmit={onSubmit}>
        <Stack>
      <TextInput
        placeholder="Enter title"
        label="Title"
        withAsterisk
        {...form.getInputProps('title')}
      />
      <MultiSelect
        withAsterisk
        label="Languages"
        placeholder="Type to create new language"
        searchable
        creatable
        data={["English"]}
        getCreateLabel={query => `+ Create ${query}`}
        //@ts-ignore
        onCreate={query => {
          throw new Error("Not implemented")
        }}
        {...form.getInputProps('languages')}
        />
        <Group position="right">
          <Button variant="subtle" onClick={close}>Cancel</Button>
          <Button variant="filled" type="submit">Submit</Button>
        </Group>
        </Stack>
      </form>
      </FormProvider>
    </Modal>
  )
}