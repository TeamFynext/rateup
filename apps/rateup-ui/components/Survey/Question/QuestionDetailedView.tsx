import { useCallback, useContext, useEffect, useRef, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useForm, UseFormReturnType } from "@mantine/form";
import {
  ActionIcon,
  Checkbox,
  Group,
  Stack,
  TextInput,
  Center,
  ScrollArea,
  Divider,
  Box,
} from "@mantine/core";
import { useRouter } from "next/router";
import { QuestionType } from "../../../types/enums";
import {
  IconDeviceSdCard,
  IconEdit,
  IconEye,
  IconPlus,
  IconStar,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import QuestionTypePreview from "./Previews/QuestionTypePreview";
import {
  googleReviewSupportedTypes,
  logicSupportedTypes,
  validationSupportedTypes,
} from "../../../utils/data";
import { notifications } from "@mantine/notifications";

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
}
export function QuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [isSaving, setIsSaving] = useState(false);
  const [titleFontSize, setTitleFontSize] = useState("2rem");
  const textInputRef = useRef(null);

  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
    setIsSaving,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
    setIsSaving,
  });

  const form = useForm({
    initialValues: {
      title: question?.title[selectedLanguage] || "",
      description: question?.description[selectedLanguage] || "",
      required: question?.required,
      type: question?.type,
      choices: question?.choices,
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : "Title is required"),
    },
  });

  //font resize on lengthy title
  useEffect(() => {
    const textLength = textInputRef?.current?.value?.length;
    resizeFont(textLength);
  }, [textInputRef?.current?.value, question?.title[selectedLanguage]]);

  function resizeFont(textLength) {
    if (textLength > 50) {
      setTitleFontSize("1rem");
    } else if (textLength > 25) {
      setTitleFontSize("1.5rem");
    } else {
      setTitleFontSize("2rem");
    }
  }

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
      return "error";
    } else {
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

      let langList: string[] = surveyLanguages;
      const missingLangs = [];

      langList?.forEach((language: string) => {
        if (language == selectedLanguage) {
          return;
        }
        if (!question.title[language] || question.title[language] == "") {
          missingLangs.push(language);
        }
      });

      if (missingLangs.length > 0) {
        setIsSaving(false);
        setSelectedLanguage(missingLangs[0]);
        form.setFieldValue(title, "");
        form.validate();
        notifications.show({
          id: "errorn",
          color: "red",
          title: `"${missingLangs[0]}" Question is missing`,
          message: `Add question in ${missingLangs[0]} language  also`,
          icon: <IconX size="1rem" />,
          //autoClose: 5000,
          // position: "bottom-center"
        });
        return "error";
      }
    }

    //setIsSaving(false);
    return "saved";
  };

  // TODO: show question type somewhere
  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <ScrollArea style={{ height: "80%" }}>
        <Stack>
          <Stack style={{ minHeight: "150px", height: "100%" }}>
            <TextInput
              fw={800}
              fz="lg"
              ref={textInputRef}
              styles={{
                input: {
                  fontSize: titleFontSize,
                  fontWeight: 700, // set custom font size for this TextInput
                },
              }}
              style={{
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
          <Divider
            my="xs"
            variant="dashed"
            labelPosition="center"
            label={
              <>
                <IconEye size={12} />
                <Box ml={5}>Preview</Box>
              </>
            }
          />
          <Center pb="xl" mb="lg" pl="xl" ml="xl" mt="4rem">
            <QuestionTypePreview type={question?.type} />
          </Center>
        </Stack>
      </ScrollArea>

      <Stack style={{ height: "10%", position: "sticky", bottom: "0" }}>
        <Divider />

        <Group mt="sm" justify="space-between" gap="sm">
          <Group justify="flex-start" gap="md">
            <Checkbox
              label="Required"
              color="var(--tertiary-color)"
              fw={600}
              mr="100px"
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Logic Jump"}
                leftIcon={<IconEdit />}
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.LogicEditor);
                }}
              />
            )}
            {googleReviewSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Google Review"}
                leftIcon={<IconStar />}
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.GoogleReviewEditor);
                }}
              />
            )}
            {validationSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Custom Validation"}
                leftIcon={<IconEdit />}
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.ValidationRulesEditor);
                }}
              />
            )}
          </Group>

          <Group>
            <RateupButtonBlue
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
    [handleAddChoice],
  );

  return (
    <>
      <Stack py="xs" gap={"xs"}>
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
        <RateupButtonSecondary
          title={"Add choice"}
          size="sm"
          variant="outline"
          color="var(--tertiary-color)"
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
    <Group ref={ref} style={{ height: "30px" }}>
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
    case QuestionType.DDSS:
    case QuestionType.DDMS:
      return <ChoicesCreator qId={question.id} form={form} />;
    default:
      return null;
  }
}
