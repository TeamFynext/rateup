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
  Badge,
  Textarea,
  Image,
} from "@mantine/core";
import { useRouter } from "next/router";
import { QuestionType } from "../../../types/enums";
import {
  IconDeviceSdCard,
  IconEdit,
  IconEye,
  IconPlus,
  IconTrash,
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
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../utils/questions";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import { IconBrandGoogle } from "@tabler/icons";

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

  const [currentResponse, updateResponse] = useState(null || []); //temp state for preview

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
    initialValues: getInitialQuestionValues(question, surveyLanguages),
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

  const handleSave = () => {
    setIsSaving(true);
    if (
      !form.values.title[selectedLanguage] ||
      form.values.title[selectedLanguage] == ""
    ) {
      setIsSaving(false);
      showErrorToast("Question title is missing");
      return "error";
    } else {
      const missingLangs = validateAllLanguagesArePopulated(
        surveyLanguages,
        form.values.title,
      );
      const completedLangs = surveyLanguages.filter(
        (lang) => !missingLangs.includes(lang),
      );

      if (missingLangs.length > 0) {
        setIsSaving(false);
        setSelectedLanguage(missingLangs[0]);
        showSuccessToast(`Question is added in ${completedLangs}.`);
        return "error";
      }

      // Checking if its a new question
      if (!question.id) {
        // Creating new question
        questionCreateMutation
          .mutateAsync(form.values)
          .then((r) => {
            const newQ: Question = r.data;
            setSelectedQ(newQ);
          })
          .finally(() => {
            setIsSaving(false);
          });
      } else {
        // Updating existing question
        questionUpdateMutation
          .mutateAsync({ qId: question.id, data: form.values })
          .finally(() => {
            setIsSaving(false);
          });
      }
    }

    return "saved";
  };
  // TODO: show question type somewhere
  return (
    <form onSubmit={form.onSubmit(handleSave)} style={{ height: "100%" }}>
      <Stack justify="space-between" style={{ height: "100%" }}>
        <ScrollArea style={{ height: "80%" }}>
          <Stack>
            <Group justify="space-between" p={2} gap={2}>
              <Stack style={{ minHeight: "150px", height: "100%", flex: 1 }}>
                <Textarea
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
                  autosize
                  maxRows={3}
                  placeholder="Enter question title here *"
                  {...form.getInputProps(`title.${selectedLanguage}`)}
                  value={form.values.title[selectedLanguage]}
                />
                <Textarea
                  variant="unstyled"
                  placeholder="Enter question description here"
                  {...form.getInputProps(`description.${selectedLanguage}`)}
                  value={form.values.description[selectedLanguage]}
                  styles={{
                    input: {
                      fontSize: "1.1rem",
                      fontWeight: 400, // set custom font size for this TextInput
                    },
                  }}
                />
                <ExtraProps form={form} question={question} />
              </Stack>
              <LanguageCompletionView
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                languages={surveyLanguages}
                notCompletedLanguages={validateAllLanguagesArePopulated(
                  surveyLanguages,
                  form.values.title,
                )}
              />
            </Group>
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
              <CurrentResponsesContext.Provider
                value={{ response: currentResponse, updateResponse }}
              >
                <QuestionTypePreview
                  type={question?.type}
                  choices={form.values.choices}
                />
              </CurrentResponsesContext.Provider>
            </Center>
          </Stack>
        </ScrollArea>

        <Stack>
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
                  leftIcon={
                    <Image
                      src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`}
                      height={30}
                      width={30}
                      fit="contain"
                    />
                  }
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
                  leftIcon={<IconBrandGoogle stroke={4} size={"1rem"} />}
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
            </Group>
          </Group>
        </Stack>
      </Stack>
    </form>
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

const LanguageCompletionView = ({
  languages,
  notCompletedLanguages,
  selectedLanguage,
  setSelectedLanguage,
}: {
  languages: string[];
  notCompletedLanguages: string[];
  selectedLanguage?: string;
  setSelectedLanguage?: React.Dispatch<React.SetStateAction<string>>;
}) => {
  function isLanguageCompleted(language: string) {
    return !notCompletedLanguages.includes(language);
  }

  return (
    <PaperLayout w={"fit-content"} p={10} radius={"md"}>
      <Stack gap={5}>
        {languages.map((language) => {
          const { hovered, ref } = useHover();
          return (
            <Badge
              id={language}
              ref={ref}
              style={{ cursor: "pointer" }}
              color={isLanguageCompleted(language) ? "green" : "red"}
              variant={
                selectedLanguage === language || hovered ? "filled" : "light"
              }
              onClick={() => setSelectedLanguage(language)}
            >
              {language}
            </Badge>
          );
        })}
      </Stack>
    </PaperLayout>
  );
};
