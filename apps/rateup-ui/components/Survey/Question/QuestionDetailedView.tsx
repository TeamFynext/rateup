import { MutableRefObject, Ref, RefObject, useContext, useEffect, useState } from "react"
import SelectedLanguageContext from "../../../context/SelectedLanguage"
import { useForm, UseFormReturnType } from "@mantine/form"
import { ActionIcon, Box, Button, Checkbox, Container, Group, Select, Stack, TextInput, useMantineTheme } from "@mantine/core"
import { createQuestion, updateQuestion } from "../../../api/surveys/questions/questions.api"
import { notifications } from "@mantine/notifications"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/router"
import { QuestionType } from "../../../types/enums"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useHover, useListState } from "@mantine/hooks"

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
}
export function QuestionDetailedView({ question, setSelectedQ }: QuestionDetailedViewProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };

  const { selectedLanguage } = useContext(SelectedLanguageContext)
  const queryClient = useQueryClient();

  const form = useForm({
    // Any modifications to initialValues must be applied in the useEffect below
    initialValues: {
      title: question.title[selectedLanguage] || "",
      description: question.description[selectedLanguage] || "",
      required: question.required,
      type: question.type,
      choices: question.choices
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
      choices: question.choices
    })
  }, [question])

  const handleSave = () => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors)
      return;
    }

    // converting to expected format
    const { title, description, ...restOfTheData } = form.values;
    const formattedTitle = { ...question.title, [selectedLanguage]: title }
    const formattedDescription = { ...question.description, [selectedLanguage]: description }

    // TODO: only send modified fields
    const data = { title: formattedTitle, description: formattedDescription, ...restOfTheData }
    // Checking if its a new question
    if (!question.id) {
      // Creating new question
      createQuestion(surveyId, data)
        .then((r) => {
          notifications.show({
            message: "Question created"
          });
          const newQ: Question = r.data;
          setSelectedQ(newQ)
          queryClient.invalidateQueries(["questions"])
        })
        .catch((e) => {
          console.error(e)
          notifications.show({
            message: "An error has occurred",
            color: "red"
          });
        })
    } else {
      // Updating existing question
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
      {/* TODO: Only display for MCQ & MSQ*/}
      <ChoicesCreator
        qId={question.id}
        form={form}
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
        </Group>
      </Group>
    </Box>
  )
}

// TODO: move to new file
// TODO: better name? :)
interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
}
function ChoicesCreator({ form, qId }: ChoicesCreatorProps) {
  const [newChoice, setNewChoice] = useState<string>("")
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;

  const choices = form.values.choices?.[selectedLanguage] || []

  useEffect(() => {

  }, [choices])

  const handleAddChoice = () => {
    if (newChoice.trim().length === 0) return;
    if (choices.includes(newChoice)) return;

    form.setFieldValue("choices", { ...form.values.choices, [selectedLanguage]: [...choices, newChoice] })
    setNewChoice("")
  }

  const handleRemoveChoice = (choice) => {
    form.setFieldValue("choices", { ...form.values.choices, [selectedLanguage]: choices.filter((c) => c !== choice) })
  }


  return (
    <>
      <Stack py="xs" spacing={"xs"}>
        {choices.map((choice, i) => (
          <Choice
            key={choice}
            choice={choice}
            onDelete={() => handleRemoveChoice(choice)}
          />
        ))}
      </Stack>

      <Group >
        <TextInput
          placeholder="Enter choice here"
          value={newChoice}
          onChange={(e) => setNewChoice(e.currentTarget.value)}
        />

        <Button
          leftIcon={<IconPlus />}
          onClick={handleAddChoice}
        >
          Add choice
        </Button>
      </Group>

    </>
  )
}

interface ChoiceProps {
  choice: string;
  onDelete: () => void;
}
function Choice({ choice, onDelete }: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>()

  return (
    <Group ref={ref} sx={{ height: "30px" }}>
      <Checkbox
        label={choice}
        checked={false}
        readOnly
      />
      {
        hovered && (
          <ActionIcon variant="transparent" color="red" onClick={onDelete} size={"sm"}>
            <IconTrash />
          </ActionIcon>
        )
      }
    </Group>
  )
}