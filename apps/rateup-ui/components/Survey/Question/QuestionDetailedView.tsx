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
  Select,
  Text,
  Flex,
} from "@mantine/core";
import { useRouter } from "next/router";
import { NPSWeightage, QuestionType } from "../../../types/enums";
import {
  IconDeviceSdCard,
  IconEdit,
  IconEye,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useDisclosure, useHover } from "@mantine/hooks";
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
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import { IconBrandGoogle } from "@tabler/icons";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { LanguageCompletionView } from "./LanguageCompletionView";
import FormModalLayout from "../../Modal/FormModalLayout";

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
  const incompleteLanguages = validateAllLanguagesArePopulated(
    surveyLanguages,
    form.values.title,
  );
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
      const completedLangs = surveyLanguages.filter(
        (lang) => !incompleteLanguages.includes(lang),
      );

      if (incompleteLanguages.length > 0) {
        setIsSaving(false);
        setSelectedLanguage(incompleteLanguages[0]);
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
  return (
    <form onSubmit={form.onSubmit(handleSave)} style={{ height: "100%" }}>
      <Stack justify="space-between" style={{ height: "100%" }}>
        <ScrollArea style={{ height: "80%" }}>
          <Stack>
            <Badge variant="outline" size="lg">
              {question.type}
            </Badge>
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
                notCompletedLanguages={incompleteLanguages}
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
                title={
                  incompleteLanguages.length > 1 ||
                  (incompleteLanguages.length > 0 &&
                    incompleteLanguages[0] !== selectedLanguage)
                    ? "Fill Next Language"
                    : "Save"
                }
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

// TODO: use ./ChoicesCreator.tsx instead of this
interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
}

function ChoicesCreator({ form, qId }: ChoicesCreatorProps) {
  const [newChoice, setNewChoice] = useState<string>("");
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const [choiceWeightage, setChoiceWeightage] = useState<NPSWeightage>(
    NPSWeightage.PROMOTER,
  );

  const choices = form.values.choices?.[selectedLanguage] || [];

  useEffect(() => {}, [choices]);

  const handleAddChoice = () => {
    if (newChoice.trim().length === 0) return;
    if (choiceWeightage.trim().length === 0) return;
    if (choices.some((c) => c.value == newChoice)) return;
    let choiceObj = {
      value: newChoice,
      weightage:
        form.values.type === QuestionType.CustomNPS
          ? choiceWeightage
          : undefined,
    };
    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: [...choices, choiceObj],
    });
    setNewChoice("");
    setChoiceWeightage(NPSWeightage.PROMOTER);
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
      <Stack
        py="xs"
        gap={form.values.type == QuestionType.CustomNPS ? "lg" : "xs"}
      >
        {choices.map((choice, i) => (
          <Choice
            key={i}
            choice={choice}
            onDelete={() => handleRemoveChoice(choice)}
            qtype={form.values.type}
            form={form}
            index={i}
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
        {form?.values?.type === QuestionType.CustomNPS && (
          <Select
            data={Object.values(NPSWeightage)}
            value={choiceWeightage}
            onChange={setChoiceWeightage as any}
            maw={140}
            styles={{
              input: { outline: `1px solid ${getNpsColor(choiceWeightage)}` },
            }}
            radius={"md"}
            allowDeselect={false}
          />
        )}
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
  choice: Choice;
  onDelete: () => void;
  qtype: string;
  form;
  index;
}
function Choice({ choice, onDelete, qtype, form, index }: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>();
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  let newWeightage = choice.weightage;
  const [opened, { open, close }] = useDisclosure(false);
  const [choiceValue, setChoiceValue] = useState(choice?.value);
  const [error, setError] = useState("");

  const handleChangeWeightage = (value) => {
    const updatedChoices = form.values.choices?.[selectedLanguage]?.map((c) => {
      if (c.value == choice?.value) return { ...c, weightage: value };
      else return c;
    });

    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: updatedChoices,
    });
  };
  const handleEditChoice = () => {
    const isExist = form.values.choices?.[selectedLanguage]?.some((c, i) => {
      return c.value?.trim() == choiceValue?.trim();
    });
    if (isExist) {
      setError("Choice Already exist");
      return;
    } else {
      setError("");
      const updatedChoices = form.values.choices?.[selectedLanguage]?.map(
        (c, i) => {
          if (i == index) return { ...c, value: choiceValue };
          else return c;
        },
      );

      form.setFieldValue("choices", {
        ...form.values.choices,
        [selectedLanguage]: updatedChoices,
      });
      close();
    }
  };

  return (
    <>
      <Group ref={ref}>
        {qtype == QuestionType.CustomNPS ? (
          <Flex gap={"xs"}>
            <Badge color={getNpsColor(choice.weightage)} mt={"5px"}></Badge>
            <Text maw={400}>{choice.value}</Text>
            <Select
              data={Object.values(NPSWeightage)}
              value={newWeightage}
              onChange={handleChangeWeightage}
              maw={140}
              styles={{
                input: { outline: `1px solid ${getNpsColor(newWeightage)}` },
              }}
              radius={"md"}
              allowDeselect={false}
            />
          </Flex>
        ) : (
          <Checkbox label={choice.value} maw={"85%"} checked={false} readOnly />
        )}
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
        <ActionIcon variant="transparent" onClick={open} size={"sm"}>
          <IconEdit />
        </ActionIcon>
        <FormModalLayout
          opened={opened}
          title="Edit Choice"
          onClose={close}
          centered
        >
          <Stack justify="center">
            <ContainedTextField
              value={choiceValue}
              onChange={(event) => {
                setError("");
                setChoiceValue(event.target.value);
              }}
              error={error}
            />
            <RateupButtonBlue title="Edit choice" onClick={handleEditChoice} />
          </Stack>
        </FormModalLayout>
      </Group>
    </>
  );
}

export function getNpsColor(npstype) {
  switch (npstype) {
    case NPSWeightage.PROMOTER:
      return "green";
    case NPSWeightage.PASSIVE:
      return "yellow";
    case NPSWeightage.DETRACTOR:
      return "red";
    default:
      return "var(--tertiary-color)";
  }
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
    case QuestionType.CustomNPS:
      return <ChoicesCreator qId={question?.id} form={form} />;
    default:
      return null;
  }
}
