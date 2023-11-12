import {
  Stack,
  TextInput,
  Divider,
  Group,
  Checkbox,
  Textarea,
  Popover,
  ActionIcon,
  Box,
  useMantineTheme,
  Switch,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { IconX, IconEdit, IconEye } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useState, useContext, useEffect } from "react";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType } from "../../../types/enums";
import { logicSupportedTypes } from "../../../utils/data";
import {
  RateupButtonOutline,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import { QuestionTabsEnum } from "./WaEditSurvey";
import { LengthTracker } from "../../input/LengthTracker";
import { WA_BODY_CHAR_LIMIT, WA_HEADER_CHAR_LIMIT } from "../whatsappConfig";
import { WaListMessageItemsCreator } from "./WaListMessageItemsCreator";
import { ChoicesCreator } from "../../Survey/Question/ChoicesCreator";
import { showErrorToast } from "../../../utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../utils/questions";
import { WhatsappChatPreview } from "./WaChatPreview";

interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
}
export function WaQuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  const theme = useMantineTheme();
  const { surveyId } = router.query as { surveyId: string };
  const [isSaving, setIsSaving] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [enableTitle, setEnableTitle] = useState(
    !!question?.title?.[selectedLanguage],
  );

  useEffect(() => {
    if (!enableTitle) {
      form.setFieldValue(
        "title",
        getInitialQuestionValues(question, surveyLanguages, "whatsapp").title,
      );
    }
  }, [enableTitle]);

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
    setIsSaving,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
    setIsSaving,
  });

  const form = useForm({
    initialValues: getInitialQuestionValues(
      question,
      surveyLanguages,
      "whatsapp",
    ),
    validate: {
      description: (desc) => {
        const value = desc[selectedLanguage];
        if (value.trim().length > 4096) {
          return "Character length exceed (Max 4096 charecters allowed)";
        } else if (value.trim().length == 0) {
          return "message is required";
        }
      },
      title: (title) => {
        const value = title[selectedLanguage];
        if (enableTitle) {
          if (value.trim().length === 0) {
            return "Enter a title or disable it";
          } else if (value.trim().length > 60) {
            return "Max 60 charecters allowed";
          }
        }
      },
    },
  });

  // For live preview.
  // TODO: check if this operation is expensive
  useEffect(() => {
    setSelectedQ({ ...question, ...form.values });
  }, [form.values]);

  // Copy of handleSave from QuestionDetailedView.tsx
  const handleSave = () => {
    setIsSaving(true);
    if (
      !form.values.description[selectedLanguage] ||
      form.values.description[selectedLanguage] == ""
    ) {
      console.log(selectedLanguage, form.values.description);
      setIsSaving(false);
      showErrorToast("Question body is missing");
      return "error";
    } else {
      const missingLangs = validateAllLanguagesArePopulated(
        surveyLanguages,
        form.values.description,
      );

      if (missingLangs.length > 0) {
        setIsSaving(false);
        showErrorToast(`Question is missing in ${missingLangs[0]} language`);
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
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      gap={"xs"}
    >
      <Stack
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "clip",
        }}
        gap={0}
      >
        <Switch
          label="Enable Header"
          checked={enableTitle}
          onChange={(e) => setEnableTitle(e.currentTarget.checked)}
          mb="sm"
          ml="sm"
          styles={{
            track: {
              cursor: "pointer",
            },
          }}
        />
        {enableTitle && (
          <TextInput
            fw={800}
            maw={"95%"}
            variant="unstyled"
            mx="sm"
            style={{
              fontSize: "28px",
            }}
            placeholder="Enter message header here"
            rightSection={
              <LengthTracker
                string={form.values.title[selectedLanguage]}
                maxValue={WA_HEADER_CHAR_LIMIT}
              />
            }
            {...form.getInputProps(`title.${selectedLanguage}`)}
            value={form.values.title[selectedLanguage]}
          />
        )}
        <Textarea
          mx="sm"
          maw={"95%"}
          autosize
          maxRows={4}
          variant="unstyled"
          placeholder="Enter message body here *"
          style={{
            fontSize: "22px",
          }}
          rightSection={
            <LengthTracker
              string={form.values.description[selectedLanguage]}
              maxValue={WA_BODY_CHAR_LIMIT}
            />
          }
          {...form.getInputProps(`description.${selectedLanguage}`)}
          value={form.values.description[selectedLanguage]}
        />
        <ExtraProps form={form} question={question} />
      </Stack>

      <Divider />

      <Stack
        pt="sm"
        style={{ height: "40px", position: "sticky", bottom: "0" }}
      >
        <Group justify="space-between" gap="sm">
          <Group>
            <Checkbox
              label="Required"
              fw={600}
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonOutline
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
            {/* TODO: Implement Google review & Custom Validation*/}
          </Group>
          <RateupButtonPrimary
            title={"Save"}
            size="md"
            onClick={handleSave}
            loading={isSaving}
          />
        </Group>
        <Group justify="flex-start" gap="md"></Group>
      </Stack>

      <Popover
        position="left"
        opened={previewOpened}
        onChange={setPreviewOpened}
        offset={{ crossAxis: 160, mainAxis: 8 }}
        closeOnClickOutside={false}
      >
        <Popover.Target>
          <ActionIcon
            style={{
              position: "absolute",
              right: "-16px",
              top: "20%",
              borderRadius: "100px",
              borderTopRightRadius: "0px",
              borderBottomRightRadius: "0px",
              height: "50px",
              width: "50px",
              zIndex: 2,
            }}
            onClick={() => setPreviewOpened((prev) => !prev)}
          >
            {previewOpened ? (
              <IconX />
            ) : (
              <IconEye style={{ width: "70%", height: "70%" }} stroke={2} />
            )}
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          p="0"
          style={{
            borderRadius: "16px",
          }}
        >
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              height: "600px",
              borderRadius: "16px",
              border: "2px solid",
              borderColor: theme.colors["whatsapp-green"][6],
            }}
          >
            <WhatsappChatPreview selectedQ={question} />
          </Box>
        </Popover.Dropdown>
      </Popover>
    </Stack>
  );
}

interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
function ExtraProps({ form, question }: ExtraPropsProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
      return <ChoicesCreator qId={question.id} form={form} />;
    case QuestionType.WaButtons:
      return (
        <ChoicesCreator
          qId={question.id}
          form={form}
          maxChoiceCount={3}
          maxCharCount={20}
        />
      );
    case QuestionType.WaList:
      return (
        <WaListMessageItemsCreator
          initialSections={form.values.sections?.[selectedLanguage]}
          saveSections={(sections) => {
            form.setFieldValue(`sections.${selectedLanguage}`, sections);
          }}
        />
      );
    default:
      return null;
  }
}
