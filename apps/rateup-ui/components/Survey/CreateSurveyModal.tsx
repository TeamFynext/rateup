import { Button, Group, Modal, MultiSelect, Stack, TextInput } from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { createSurvey } from "../../api";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";

interface FormValues {
  title: string,
  languages: Array<string>
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();

export function CreateSurveyModal({open, close}) {
    // Used to refresh server side
    const router = useRouter();
    const refreshData = () => {
      router.replace(router.asPath);
    }
  
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
  createSurvey(form.values).then(r => {
    notifications.show({
      message: "Created!"
    })
    close()
    form.reset();
    refreshData()
  }).catch(e => console.log(e))
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
          <Button variant="subtle">Cancel</Button>
          <Button variant="filled" type="submit">Submit</Button>
        </Group>
        </Stack>
      </form>
      </FormProvider>
    </Modal>
  )
}