import { useCallback, useContext, useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useForm, UseFormReturnType } from "@mantine/form";
import {
  ActionIcon,
  Box,
  Checkbox,
  Group,
  Stack,
  TextInput,
  Flex,
  Text,
  Tabs,
  Space,
  Center,
  ScrollArea,
  Divider,
} from "@mantine/core";
import { useRouter } from "next/router";
import { QuestionType } from "../../../types/enums";
import { IconDeviceSdCard, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import {
  RateupButtonOutline,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import QuestionTypePreview from "./Previews/QuestionTypePreview";
import { googleReviewSupportedTypes, logicSupportedTypes } from "../../../utils/data";
import { IconChevronRight } from "@tabler/icons-react";
import { fi } from "@faker-js/faker";

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyType?: String;
}
export function QuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyType,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };

  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation(surveyId);
  const questionUpdateMutation = useQuestionUpdateMutation(surveyId);

  const [isSaving, setIsSaving] = useState(false);

  const form = useForm({
    // Any modifications to initialValues must be applied in the useEffect below
    initialValues: {
      title: question?.title[selectedLanguage] || "",
      description: question?.description[selectedLanguage] || "",
      required: question?.required,
      type: question?.type,
      choices: question?.choices,
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : "Title is required"),
      description: (value) => {
        if (surveyType == "web") {
          value.trim().length > 0 ? null : "Title is required";
        } else {
          //-----------whatsapp text message support only 4096 charecters only----------
          if (value.trim().length > 10) {
            return "Charecter length exceed (Max 4096 charecters allowed)";
          } else if (value.trim().length == 0) {
            return "message is required";
          }
        }
      },
    },
  });

  // reset values when switching questions
  useEffect(() => {
    // TODO: avoid duplication?
    form.setValues({
      // TODO: can we check if the value is undefined and not set it in form validation or something?
      title: question.title[selectedLanguage] || "",
      description: question.description[selectedLanguage] || "",
      required: question.required,
      type: question.type,
      choices: question.choices,
    });
  }, [question]);

  //autosave add choices

  // const handleChoicesAndRequiredChange = () => {
  //   if (form.isDirty('choices') || form.isDirty('required')) {
  //     handleSave();
  //   }
  // };

  // useEffect(() => {
  //   handleChoicesAndRequiredChange();
  // }, [form.values.choices, form.values.required]);

  const handleSave = () => {
    setIsSaving(true);

    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      setIsSaving(false);
      return;
    }

    // converting to expected format
    const { title, description, ...restOfTheData } = form.values;
    const formattedTitle = { ...question.title, [selectedLanguage]: title };
    const formattedDescription = {
      ...question.description,
      [selectedLanguage]: description,
    };

    // TODO: only send modified fields
    const data = {
      title: formattedTitle,
      description: formattedDescription,
      ...restOfTheData,
    };
    // Checking if its a new question
    if (!question.id) {
      // Creating new question
      questionCreateMutation.mutateAsync(data).then((r) => {
        const newQ: Question = r.data;
        setSelectedQ(newQ);
      });
    } else {
      // Updating existing question
      questionUpdateMutation.mutate({ qId: question.id, data: data });
    }
    setIsSaving(false);
  };

  // TODO: show question type somewhere
  return (
    <Stack justify="space-between" sx={{ height: "100%" }}>
      <ScrollArea sx={{ height: "80%" }}>
        <Stack>
          <Stack justify="space-between" sx={{ height: "100%" }}>
            <TextInput
              fw={800}
              fz="lg"
              styles={{
                input: {
                  fontSize: "2rem",
                  fontWeight: 700, // set custom font size for this TextInput
                },
              }}
              sx={{
                marginBottom: "20px", // add 30px bottom margin
              }}
              variant="unstyled"
              size="xl"
              placeholder="Enter question title here *"
              {...form.getInputProps("title")}
              // onBlur={() => {
              //   form.validateField('title');
              //   handleSave();
              // }}
              //TODO : add error free autosave solution
            />
            <TextInput
              variant="unstyled"
              placeholder="Enter question description here"
              {...form.getInputProps("description")}
              styles={{
                input: {
                  fontSize: "1.1rem",
                  fontWeight: 400, // set custom font size for this TextInput
                },
              }}
              // onBlur={() => {
              //   form.validateField('description');
              //   handleSave();
              // }}
            />
            <ExtraProps form={form} question={question} />
          </Stack>
          <Center pb="xl" mb="lg" pl="xl" ml="xl" mt="4rem">
            <QuestionTypePreview type={question?.type} />
          </Center>
        </Stack>
      </ScrollArea>

      <Divider />

      <Stack pt="sm" sx={{ height: "20%", position: "sticky", bottom: "0" }}>
        <Group position="apart" spacing="sm">
          <Checkbox
            label="Required"
            color="dark"
            fw={600}
            {...form.getInputProps("required", { type: "checkbox" })}
          />
          <Group>
            <RateupButtonSecondary
              title={"Save"}
              size="md"
              onClick={handleSave}
              leftIcon={<IconDeviceSdCard />}
              loading={isSaving}
            />
            {/* <RateupButtonSecondary 
                    title={"Add Next Question "}
                    size="md"
                    rightIcon={<IconChevronRight />}
                    onClick={() => setActiveTab(QuestionTabsEnum.TypeSelection)}
                  /> */}
          </Group>
        </Group>

        <Group position="apart"  spacing="md">
          {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonOutline
              title={"Logic Jump"}
              leftIcon={<IconEdit />}
              size="sm"
              onClick={() => setActiveTab(QuestionTabsEnum.LogicEditor)}
            />
          )}
          {googleReviewSupportedTypes.includes(question?.type) && (
            <RateupButtonOutline
              title={"Options"}
              size="sm"
              onClick={() => setActiveTab(QuestionTabsEnum.GoogleReviewEditor)}
            />
          )}
          <Space w="xl" />
          {question?.id && (
            <Text c="blue.9" size="sm">
              {" "}
              Question Id: {question?.id}{" "}
            </Text>
          )}
        </Group>
      </Stack>
    </Stack>
  );
}

// TODO: move to new file
// TODO: better name? :)
interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
}
function ChoicesCreator({ form, qId }: ChoicesCreatorProps) {
  const [newChoice, setNewChoice] = useState<string>("");
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;

  const choices = form.values.choices?.[selectedLanguage] || [];

  useEffect(() => {}, [choices]);

  const handleAddChoice = () => {
    if (newChoice.trim().length === 0) return;
    if (choices.includes(newChoice)) return;

    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: [...choices, newChoice],
    });
    setNewChoice("");
  };

  const handleRemoveChoice = (choice) => {
    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: choices.filter((c) => c !== choice),
    });
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleAddChoice();
      }
    },
    [handleAddChoice]
  );

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

      <Group>
        <TextInput
          placeholder="Enter choice here"
          value={newChoice}
          onChange={(e) => setNewChoice(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        <RateupButtonPrimary
          title={"Add choice"}
          size="sm"
          leftIcon={<IconPlus size="1rem" />}
          onClick={handleAddChoice}
        />
      </Group>
    </>
  );
}

interface ChoiceProps {
  choice: string;
  onDelete: () => void;
}
function Choice({ choice, onDelete }: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>();

  return (
    <Group ref={ref} sx={{ height: "30px" }}>
      <Checkbox label={choice} checked={false} readOnly />
      {hovered && (
        <ActionIcon
          variant="transparent"
          color="red"
          onClick={onDelete}
          size={"sm"}
        >
          <IconTrash />
        </ActionIcon>
      )}
    </Group>
  );
}

interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
function ExtraProps({ form, question }: ExtraPropsProps) {
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
      return <ChoicesCreator qId={question.id} form={form} />;
    default:
      return null;
  }
}
