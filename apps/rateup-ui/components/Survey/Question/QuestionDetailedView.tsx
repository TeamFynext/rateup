import { useContext, useEffect } from "react"
import SelectedLanguageContext from "../../../context/SelectedLanguage"
import { useForm } from "@mantine/form"
import { Box, Button, Checkbox, Group, Select, TextInput } from "@mantine/core"
import { updateQuestion } from "../../../api/surveys/questions/questions.api"
import { notifications } from "@mantine/notifications"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/router"
import { QuestionType } from "../../../types/enums"

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
export function QuestionDetailedView({ question }) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  
  const { selectedLanguage } = useContext(SelectedLanguageContext)
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      title: question.title[selectedLanguage] || "",
      description: question.description[selectedLanguage] || "",
      required: question.required,
      type: question.type,
    },
    validate: {
      title: (value) => value.trim().length > 0 ? null : "Title is required",
    }
  })

  // reset values when switching questions
  useEffect(() => {
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
    updateQuestion(surveyId, question.id, data)
      .then(() => {
        notifications.show({
          message: "Question updated"
        });
        queryClient.invalidateQueries(["questions"])
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
        size="xl"
        placeholder="Enter question title here"
        {...form.getInputProps('title')}
      />
      <TextInput
        variant="unstyled"
        placeholder="Enter question description here"
        {...form.getInputProps('description')}
      />
      <Group position="apart" sx={{ position: "absolute", bottom: "0px", left: "0px", width: "100%" }}>
        <Group>
          <Select
            radius="xl"
            sx={{ width: "175px" }}
            data={Object.values(QuestionType)}
            {...form.getInputProps('type')}
          />
          <Checkbox
            label="Required"
            color="dark"
            {...form.getInputProps('required', { type: 'checkbox' })}
          />
        </Group>
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