import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Badge,
  Box,
  Checkbox,
  Divider,
  Group,
  Image,
  ScrollArea,
  Stack,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  useMantineTheme,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import _ from "lodash";

import {
  IntegratedApps,
  QuestionType,
  SurveyType,
  WaFlowFormElementType,
  WaFlowStatus,
} from "@/types/enums";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "@/backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "@/components/input/LengthTracker";
import GoogleReviewEditor from "@/components/Survey/Question/GoogleReviewEditor";
import { ChoicesCreator } from "@/components/Survey/Question/QuestionExtraProps/ChoicesCreator";
import { TextareaWithLengthTracker } from "@/components/Survey/ShareSurvey/FlowShareTemplateEditor";
import {
  getFlowLabelLimit,
  getFlowOptionsLimit,
  WA_FLOW_BODY_CHAR_LIMIT,
  WA_FLOW_HEADING_CHAR_LIMIT,
} from "@/components/whatsapp/whatsappConfig";
import SelectedLanguageContext from "@/context/SelectedLanguage";
import { SAVE_HOTKEY, WaNPSQuestions } from "@/utils/constants";
import { googleReviewSupportedTypes, logicSupportedTypes } from "@/utils/data";
import { showErrorToast } from "@/utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "@/utils/questions";
import {
  getFlowTextLimit,
  questionTypeToFlowFormElementType,
} from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext";
import { FlowLogicEditor } from "./FlowLogicEditor";

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
}: Readonly<QuestionDetailedViewProps>) {
  const [activeEditor, setActiveEditor] = useState<EditorType>(
    EditorType.ElementEditor,
  );

  const updateQuestionMutation = useQuestionUpdateMutation({ surveyId });

  function handleUpdateQuestion(q: Question) {
    const { googleReview } = q;
    notifications.show({
      id: "load-data",
      loading: true,
      title: "updating question",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });
    updateQuestionMutation.mutate({ qId: q.id, data: { googleReview } });
  }

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
    case EditorType.GoogleReviewEditor:
      return (
        <GoogleReviewEditor
          selectedQ={question}
          setSelectedQ={handleUpdateQuestion}
          setActiveTab={() => {}}
          surveyId={surveyId}
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
}: Readonly<ElementEditorProps>) {
  const theme = useMantineTheme();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { selectedScreenId, flowJson } = useContext(EditFlowContext);
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
  const currentIndex = flowJson.screens.findIndex(
    (s) => s.id === selectedScreenId,
  );
  const nextScreens = flowJson.screens.slice(currentIndex + 1);

  const labelMaxLength = getFlowLabelLimit(
    questionTypeToFlowFormElementType(question.type as QuestionType),
  );

  function validateLabel(value: string) {
    if (!value) return "Label is required";
    if (value.trim().length > labelMaxLength) {
      return `Max ${labelMaxLength} characters allowed`;
    }
  }

  const formInitialValues = getInitialQuestionValues(
    question,
    surveyLanguages,
    SurveyType.WaFlow,
  );
  const form = useForm({
    initialValues: formInitialValues,
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

  form.watch("choices", ({ previousValue, value, touched, dirty }) => {
    handleSave();
  });

  function getIncompleteLanguages() {
    return validateAllLanguagesArePopulated(
      form.values as Question,
      surveyLanguages,
      ["choices"],
    );
  }

  // Copy of handleSave from QuestionDetailedView.tsx
  const handleSave = () => {
    if (!flowEditable) {
      showErrorToast("Published Flows cannot be edited");
      return;
    }
    const res = form.validate();
    if (res.hasErrors) {
      showErrorToast("Fix errors before saving");
      return "error";
    } else {
      if (getIncompleteLanguages().length > 0) {
        setSelectedLanguage(getIncompleteLanguages()[0]);
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
        notifications.show({
          id: "load-data",
          loading: true,
          title: "updating question",
          message: `Hold on, your changes are getting updated...`,
          autoClose: false,
          withCloseButton: false,
        });
        questionUpdateMutation.mutate({
          qId: question.id,
          data: form.getValues(),
        });
      }
    }

    return "saved";
  };

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending;

  const labelInputProps = form.getInputProps(`label.${selectedLanguage}`);
  // TODO: defer error checking until user has entered some text
  labelInputProps.error = validateLabel(labelInputProps.value);

  useEffect(() => {
    if (formInitialValues.required !== form.values.required && form.isValid())
      handleSave();
  }, [form.values.required]);

  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      justify="space-between"
      onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSave]])}
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
            {question.type !== QuestionType.Optin && (
              <>
                <TextareaWithLengthTracker
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
                  maxValue={getFlowTextLimit(
                    WaFlowFormElementType.textSubHeading,
                  )}
                  {...form.getInputProps(`title.${selectedLanguage}`)}
                  onBlur={() => {
                    if (
                      !_.isEqual(form.values, formInitialValues) &&
                      form.isValid()
                    )
                      handleSave();
                  }}
                />

                <TextareaWithLengthTracker
                  variant="unstyled"
                  placeholder="Enter question description here"
                  {...form.getInputProps(`description.${selectedLanguage}`)}
                  value={form.values.description[selectedLanguage]}
                  autosize
                  maxRows={6}
                  styles={{
                    input: {
                      fontSize: "1.1rem",
                      fontWeight: 400, // set custom font size for this TextInput
                    },
                  }}
                  maxValue={getFlowTextLimit(WaFlowFormElementType.textBody)}
                  onBlur={() => {
                    if (
                      !_.isEqual(form.values, formInitialValues) &&
                      form.isValid()
                    )
                      handleSave();
                  }}
                />
              </>
            )}
            <LabelTextInput
              {...labelInputProps}
              maxLength={labelMaxLength}
              onBlur={() => {
                if (
                  !_.isEqual(form.values, formInitialValues) &&
                  form.isValid()
                )
                  handleSave();
              }}
            />
            {question.type === QuestionType.Optin && (
              <ContainedSelection
                data={nextScreens?.map((data) => ({
                  label: data?.title,
                  value: data?.id,
                }))}
                {...form.getInputProps("optinScreenId")}
                label={"Read more screen"}
                placeholder="select next screen to show the details"
                w={300}
              />
            )}
            {question.type === QuestionType.Date && (
              <Stack mt={"xs"}>
                <Switch
                  size="md"
                  label={"Enable dynamic datepicker"}
                  {...form.getInputProps("onSelectAction", {
                    type: "checkbox",
                  })}
                />
                {form.values.onSelectAction && (
                  <ContainedSelection
                    label={"Integration App Name"}
                    placeholder="Select Integration App Name"
                    data={[IntegratedApps.amelia]}
                    {...form.getInputProps("waAppName")}
                    w={400}
                  />
                )}
              </Stack>
            )}

            <FlowQuestionExtraProps
              form={form}
              question={question}
              handleSave={handleSave}
            />
          </Stack>
        </Group>
      </ScrollArea>

      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <Group>
            <Checkbox
              label="Required"
              fw={600}
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            {WaNPSQuestions.includes(question?.type as QuestionType) && (
              <Checkbox
                label="NPS Analytics"
                fw={600}
                checked={form.values?.enableNpsAnalytics}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  form.setFieldValue("enableNpsAnalytics", checked);
                }}
              />
            )}
          </Group>
          <Group>
            {logicSupportedTypes.includes(question?.type as QuestionType) && (
              <RateupButtonSecondary
                title={"Logic Jump"}
                leftIcon={
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                    w={30}
                    h={30}
                    fit={"contain"}
                    alt="image of logic jump"
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
            {googleReviewSupportedTypes.includes(
              question?.type as QuestionType,
            ) && (
              <RateupButtonSecondary
                title={"Google Review"}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
                color={theme.colors["whatsapp-green"][6]}
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(EditorType.GoogleReviewEditor);
                }}
              />
            )}
          </Group>
          <RateupButtonPrimary
            title={
              getIncompleteLanguages().length > 1 ||
              (getIncompleteLanguages().length > 0 &&
                getIncompleteLanguages()[0] !== selectedLanguage)
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
  handleSave: () => void;
}
function FlowQuestionExtraProps({
  form,
  question,
  handleSave,
}: ExtraPropsProps) {
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
