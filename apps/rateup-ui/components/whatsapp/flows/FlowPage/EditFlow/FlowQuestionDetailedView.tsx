import {
  Stack,
  Divider,
  Group,
  Checkbox,
  Textarea,
  useMantineTheme,
  Badge,
  Image,
  ScrollArea,
  Text,
  TextInput,
  TextInputProps,
  Box,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import { useState, useContext, useEffect } from "react";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import {
  QuestionType,
  SurveyType,
  WaFlowStatus,
} from "../../../../../types/enums";
import {
  logicSupportedTypes,
  googleReviewSupportedTypes,
} from "../../../../../utils/data";
import { showErrorToast } from "../../../../../utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../../../utils/questions";
import {
  RateupButtonSecondary,
  RateupButtonPrimary,
} from "../../../../Button/RateupButtons";
import {
  WA_FLOW_HEADING_CHAR_LIMIT,
  WA_FLOW_BODY_CHAR_LIMIT,
  getFlowLabelLimit,
  getFlowOptionsLimit,
} from "../../../whatsappConfig";
import { EditFlowContext } from "./EditFlowContext";
import { FlowLogicEditor } from "./FlowLogicEditor";
import { LengthTracker } from "../../../../input/LengthTracker";
import { questionTypeToFlowFormElementType } from "../../../../../utils/whatsapp/flow.utils";
import { ChoicesCreator } from "../../../../Survey/Question/ChoicesCreator";
import { useRouter } from "next/router";
import { useWaFlowFromDb } from "../../../../../backend/whatsapp/flow/flow.query";

interface QuestionDetailedViewProps {
  question: Question;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  surveyId: string;
  onCreated: (q: Question) => void;
}

enum EditorType {
  LogicEditor = "logic-editor",
  GoogleReviewEditor = "google-review-editor",
  ElementEditor = "element-editor",
}
export function FlowQuestionDetailedView({
  question,
  surveyLanguages,
  setSelectedLanguage,
  surveyId,
  onCreated,
}: QuestionDetailedViewProps) {
  const [activeEditor, setActiveEditor] = useState<EditorType>(
    EditorType.ElementEditor,
  );
  switch (activeEditor) {
    case EditorType.ElementEditor:
      return (
        <ElementEditor
          question={question}
          surveyLanguages={surveyLanguages}
          setSelectedLanguage={setSelectedLanguage}
          surveyId={surveyId}
          onCreated={onCreated}
          setActiveTab={setActiveEditor}
        />
      );
    case EditorType.LogicEditor:
      return (
        <FlowLogicEditor
          afterSave={() => setActiveEditor(EditorType.ElementEditor)}
        />
      );
  }
}

interface ElementEditorProps extends QuestionDetailedViewProps {
  setActiveTab: (tab: EditorType) => void;
}

function ElementEditor({
  question,
  surveyLanguages,
  setSelectedLanguage,
  surveyId,
  onCreated,
  setActiveTab,
}: ElementEditorProps) {
  const theme = useMantineTheme();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { flowJson, selectedFormElementId } = useContext(EditFlowContext);
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const labelMaxLength = getFlowLabelLimit(
    questionTypeToFlowFormElementType(question.type),
  );

  function validateLabel(value: string) {
    if (!value) return "Label is required";
    if (value.trim().length > labelMaxLength) {
      return `Max ${labelMaxLength} characters allowed`;
    }
  }

  const form = useForm({
    initialValues: getInitialQuestionValues(
      question,
      surveyLanguages,
      SurveyType.WaFlow,
    ),
    validate: {
      title: (title) => {
        const value = title[selectedLanguage];
        if (value.trim().length > WA_FLOW_HEADING_CHAR_LIMIT) {
          return `Max ${WA_FLOW_HEADING_CHAR_LIMIT} characters allowed`;
        }
      },
      description: (description) => {
        const value = description[selectedLanguage];
        if (value.trim().length > WA_FLOW_BODY_CHAR_LIMIT) {
          return `Max ${WA_FLOW_BODY_CHAR_LIMIT} characters allowed`;
        }
      },
      label: (label) => {
        return validateLabel(label[selectedLanguage]);
      },
    },
  });

  const incompleteLanguages = validateAllLanguagesArePopulated(
    form.values as Question,
    surveyLanguages,
    ["choices"],
  );

  // Copy of handleSave from QuestionDetailedView.tsx
  const handleSave = () => {
    if (!flowEditable) {
      showErrorToast("Published Flows cannot be edited");
      return;
    }
    const res = form.validate();
    console.log(res);
    if (res.hasErrors) {
      showErrorToast("Fix errors before saving");
      return "error";
    } else {
      if (incompleteLanguages.length > 0) {
        setSelectedLanguage(incompleteLanguages[0]);
        return "error";
      }

      // Checking if its a new question
      if (!question.id) {
        // Creating new question
        questionCreateMutation.mutate(form.values, {
          onSuccess: (r) => {
            onCreated(r.data);
          },
        });
      } else {
        // Updating existing question
        questionUpdateMutation.mutate({ qId: question.id, data: form.values });
      }
    }

    return "saved";
  };

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending;

  const labelInputProps = form.getInputProps(`label.${selectedLanguage}`);
  // TODO: defer error checking until user has entered some text
  labelInputProps.error = validateLabel(labelInputProps.value);

  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      justify="space-between"
    >
      <ScrollArea h={"80%"}>
        <Group justify="space-between">
          <Badge variant="outline" size="lg">
            {question.type}
          </Badge>
        </Group>
        <Group p={2} gap={2} pr={42}>
          <Stack
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "clip",
              flex: 1,
            }}
            gap={0}
            p={"sm"}
          >
            <Textarea
              fw={800}
              fz="lg"
              styles={{
                input: {
                  fontSize: "1.75rem",
                  fontWeight: 700, // set custom font size for this TextInput
                },
              }}
              style={{
                marginBottom: "20px", // add 30px bottom margin
              }}
              variant="unstyled"
              autosize
              maxRows={3}
              placeholder="Enter question title here"
              {...form.getInputProps(`title.${selectedLanguage}`)}
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

            <LabelTextInput {...labelInputProps} maxLength={labelMaxLength} />

            <FlowQuestionExtraProps form={form} question={question} />
          </Stack>
        </Group>
      </ScrollArea>

      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <Checkbox
            label="Required"
            fw={600}
            {...form.getInputProps("required", { type: "checkbox" })}
          />
          <Group>
            {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Logic Jump"}
                leftIcon={
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                    w={30}
                    h={30}
                    fit={"contain"}
                  />
                }
                size="sm"
                color={theme.colors["whatsapp-green"][6]}
                onClick={() => {
                  let save = handleSave();
                  save === "saved" && setActiveTab(EditorType.LogicEditor);
                }}
              />
            )}
            {/* TODO: Implement Custom Validation*/}
            {googleReviewSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Google Review"}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
                color={theme.colors["whatsapp-green"][6]}
                onClick={() => {
                  let save = handleSave();
                  save === "saved" && setActiveTab(EditorType.ElementEditor);
                }}
              />
            )}
          </Group>
          <RateupButtonPrimary
            title={
              incompleteLanguages.length > 1 ||
              (incompleteLanguages.length > 0 &&
                incompleteLanguages[0] !== selectedLanguage)
                ? "Fill Next Language"
                : "Save"
            }
            size="md"
            leftIcon={<IconDeviceSdCard />}
            onClick={handleSave}
            loading={isSaving}
          />
        </Group>
      </Stack>
    </Stack>
  );
}

function LabelTextInput(props: TextInputProps & { maxLength: number }) {
  return (
    <TextInput
      variant="unstyled"
      placeholder="Enter question label here *"
      {...props}
      styles={{
        input: {
          fontSize: "1.1rem",
          fontWeight: 400, // set custom font size for this TextInput
        },
      }}
      rightSection={
        <LengthTracker
          length={(props.value as string).length}
          maxValue={props.maxLength}
        />
      }
      rightSectionProps={{
        style: {
          minWidth: "80px",
        },
      }}
    />
  );
}

interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
function FlowQuestionExtraProps({ form, question }: ExtraPropsProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
    case QuestionType.CustomNPS:
      const maxChoiceCount = getFlowOptionsLimit(
        questionTypeToFlowFormElementType(question.type),
      );
      return (
        <Stack gap={0} mt="xl">
          <Group justify="space-between">
            <Text fw="bold" c="dimmed">
              Choices
            </Text>
            <Divider style={{ flexGrow: 1 }} />
            <LengthTracker
              length={form.values.choices?.[selectedLanguage]?.length || 0}
              maxValue={maxChoiceCount}
            />
          </Group>
          <Box pl="xs">
            <ChoicesCreator
              qId={question.id}
              form={form}
              maxCharCount={30}
              maxChoiceCount={maxChoiceCount}
            />
          </Box>
        </Stack>
      );
    default:
      return null;
  }
}
