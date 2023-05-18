import { useContext, useEffect } from "react"
import SelectedLanguageContext from "../../../context/SelectedLanguage"
import { useForm } from "@mantine/form"
import { Box, Button, Group, Select, TextInput } from "@mantine/core"
import { QuestionType } from "../../../types"
import { updateQuestion } from "../../../api/surveys/questions/questions.api"
import { notifications } from "@mantine/notifications"

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
export function QuestionDetailedView({ question }) {
  const { selectedLanguage } = useContext(SelectedLanguageContext)

  const form = useForm({
    initialValues: {
      title: question.title[selectedLanguage],
      description: question.description[selectedLanguage],
      required: question.required,
      type: question.type,
    },
    validate: {
      title: (value) => value.trim().length > 0 ? null : "Title is required",
    }
  })

  // reset values when switching questions
  useEffect(() => {
    console.log(question.description[selectedLanguage])
    // TODO: avoid duplication?
    form.setValues({
      // TODO: can we check if the value is undefined and not set it in form validation or something?
      title: question.title[selectedLanguage] || "",
      description: question.description[selectedLanguage] || "",
      required: question.required,
      type: question.type,
    })
  }, [question])

  const handleSave = () => {
    form.validate();
    if (Object.keys(form.errors).length !== 0) {
      console.error(form.errors)
      return;
    }

    // converting to expected format
    const { title, description, ...restOfTheData } = form.values;
    const formattedTitle = { ...question.title, [selectedLanguage]: title }
    const formattedDescription = { ...question.description, [selectedLanguage]: description }

    // TODO: only send modified fields
    const data = { title: formattedTitle, description: formattedDescription, ...restOfTheData }
    updateQuestion(question.id, data).then(() => {
      notifications.show({
        message: "Question updated"
      });
    }).catch((e) => {
      console.error(e)
      notifications.show({
        message: "An error has occurred",
        color: "red"
      });
    })
  }

  return (
    <Box sx={{ position: "relative", height: "100%" }}>
      <TextInput
        variant="unstyled"
        placeholder="Enter question title here"
        {...form.getInputProps('title')}
      />
      <TextInput
        variant="unstyled"
        placeholder="Enter question description here"
        {...form.getInputProps('description')}
      />
      <Group position="apart" sx={{ position: "absolute", bottom: "0px", left: "0px", width: "100%" }}>
        <Select
          radius="xl"
          sx={{ width: "175px" }}
          data={Object.values(QuestionType)}
          {...form.getInputProps('type')}
        />
        <Group>
          <Button onClick={handleSave}>
            Save
          </Button>
          <Button>
            Add next question
          </Button>
        </Group>
      </Group>
    </Box>
  )
}