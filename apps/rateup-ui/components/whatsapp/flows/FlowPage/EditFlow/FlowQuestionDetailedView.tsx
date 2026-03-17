"use client";

import { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Alert,
  Badge,
  Box,
  Checkbox,
  Divider,
  Group,
  Image,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  useMantineTheme,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import _ from "lodash";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  DocumentMimeType,
  InputType,
  IntegratedApps,
  PhotoSource,
  QuestionType,
  SurveyType,
  WaFlowFormElementType,
  WaFlowStatus,
} from "@/types/enums";
import { WaFlowScreen } from "@/types/global";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "@/backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
} from "@/components/input/ContainedInput/ContainedInput";
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
    toast.loading(`Hold on, your changes are getting updated`, {
      id: "load-data",
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
  const { selectedScreenId, flowJson, updateFlowJson, selectedFormElementId } =
    useContext(EditFlowContext);
  const router = useRouter();
  const params = useParams();
  const dbFlowId = params.dbFlowId as string;
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
  const translations = useExtracted();
  function validateLabel(value: string) {
    if (!value) return translations("Label is required");
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

  const fileSchema = z
    .object({
      "photo-source": z
        .enum(PhotoSource)
        .refine((value) => value !== undefined, {
          message: translations("Photo source is required"),
        })
        .optional()
        .nullable(),
      "max-file-size-kb": z
        .number()
        .min(1, translations("File size must be at least 1 KB"))
        .max(25600, translations("File size cannot exceed 25600 KB")),
      "min-uploaded-photos": z.number().min(0).max(30),
      "max-uploaded-photos": z
        .number()
        .min(1, translations("Must upload at least 1 photo"))
        .max(30, translations("Cannot upload more than 30 photos")),
      "min-uploaded-documents": z.number().min(0).max(30),
      "max-uploaded-documents": z
        .number()
        .min(1, translations("Must upload at least 1 document"))
        .max(30, translations("Cannot upload more than 30 documents")),
      "allowed-mime-types": z.array(z.string()).optional(),
      "input-type": z.nativeEnum(InputType).optional().nullable(),
    })
    .check((ctx) => {
      const { value: values } = ctx;
      if (values["min-uploaded-photos"] > values["max-uploaded-photos"]) {
        ctx.issues.push({
          path: ["max-uploaded-photos"],
          code: "custom",
          message: translations(
            "Minimum uploaded photos cannot be greater than maximum",
          ),
          input: values["min-uploaded-photos"],
        });
      } else if (
        values["min-uploaded-documents"] > values["max-uploaded-documents"]
      ) {
        ctx.issues.push({
          path: ["min-uploaded-documents"],
          code: "custom",
          message: translations(
            "Minimum uploaded documents cannot be greater than maximum",
          ),
          input: values["min-uploaded-documents"],
        });
      }
    });
  const getInputType = () => {
    switch (question.type) {
      case QuestionType.Email:
        return InputType.Email;
      case QuestionType.Phone:
        return InputType.Phone;
      default:
        return InputType.Text;
    }
  };

  const extraConfigForm = useForm({
    validate: zod4Resolver(fileSchema),
    initialValues: {
      "photo-source": PhotoSource.cameraGallery,
      "max-file-size-kb": 5120,
      "min-uploaded-photos": 1,
      "max-uploaded-photos": 1,
      "min-uploaded-documents": 1,
      "max-uploaded-documents": 1,
      "allowed-mime-types": [],
      "input-type": getInputType(),
    },
  });
  useEffect(() => {
    if (question.extraConfig) {
      extraConfigForm.setValues(question.extraConfig);
    }
  }, [question.extraConfig]);

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
      toast.error(translations("Published Flows cannot be edited"));
      return;
    }

    // Form validation
    const formValidation = form.validate();
    if (formValidation.hasErrors) {
      toast.error(translations("Fix errors before saving"));
      return "error";
    }

    // Language completion check
    const incompleteLanguages = getIncompleteLanguages();
    if (incompleteLanguages.length > 0) {
      setSelectedLanguage(incompleteLanguages[0]);
      return "error";
    }

    // Extra configuration validation for specific question types

    if (
      [
        QuestionType.PhotoPicker,
        QuestionType.DocumentPicker,
        QuestionType.Text,
        QuestionType.Email,
        QuestionType.Phone,
      ].includes(question.type as QuestionType)
    ) {
      const { hasErrors: extraConfigErrors } = extraConfigForm.validate();
      if (extraConfigErrors) return "error";

      toast.dismiss();
      const updatedValues = getUpdatedValues();
      form.setFieldValue("extraConfig", updatedValues);
    }
    // Save the question - create new or update existing
    if (!question.id) {
      createNewQuestion();
    } else {
      updateExistingQuestion();
    }

    return "saved";
  };

  // Helper function to extract updated values based on question type
  const getUpdatedValues = () => {
    const extraConfigValues = (() => {
      switch (question.type) {
        case QuestionType.PhotoPicker:
          return {
            "photo-source": extraConfigForm.values["photo-source"],
            "max-file-size-kb": extraConfigForm.values["max-file-size-kb"],
            "min-uploaded-photos":
              extraConfigForm.values["min-uploaded-photos"],
            "max-uploaded-photos":
              extraConfigForm.values["max-uploaded-photos"],
          };
        case QuestionType.DocumentPicker:
          return {
            "max-file-size-kb": extraConfigForm.values["max-file-size-kb"],
            "min-uploaded-documents":
              extraConfigForm.values["min-uploaded-documents"],
            "max-uploaded-documents":
              extraConfigForm.values["max-uploaded-documents"],
            "allowed-mime-types": extraConfigForm.values["allowed-mime-types"],
          };
        case QuestionType.Text:
        case QuestionType.Email:
        case QuestionType.Phone:
          return {
            "input-type": extraConfigForm.values["input-type"],
          };
      }
    })();

    return Object.fromEntries(
      Object.entries(extraConfigValues).filter(([_, value]) => {
        // Check if value is an array with length > 0, otherwise check for truthy values
        return Array.isArray(value)
          ? value.length > 0
          : value !== undefined && value !== null && value !== "";
      }),
    );
  };

  // Create new question
  const createNewQuestion = () => {
    questionCreateMutation.mutate(form.getValues(), {
      onSuccess: (response) => {
        onCreated(response.data);
      },
    });
  };

  // Update existing question
  const updateExistingQuestion = () => {
    toast.loading(translations("Hold on, your changes are getting updated.."), {
      id: "load-data",
    });

    questionUpdateMutation.mutate(
      {
        qId: question.id,
        data: form.getValues(),
      },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success(
            translations("Your question was updated successfully"),
            {
              id: "load-data",
            },
          );
        },
      },
    );
  };

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending;

  const labelInputProps = form.getInputProps(`label.${selectedLanguage}`);
  // Ensure value is always a string (handle undefined, null, or non-string values)
  const labelValue =
    typeof labelInputProps.value === "string" ? labelInputProps.value : "";
  // TODO: defer error checking until user has entered some text
  labelInputProps.error = validateLabel(labelValue);

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
                  placeholder={translations("Enter question title here")}
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
                  placeholder={translations("Enter question description here")}
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
              value={labelValue}
              onChange={(e) =>
                form.setFieldValue(`label.${selectedLanguage}`, e.target.value)
              }
              error={labelInputProps.error}
              maxLength={labelMaxLength}
              onBlur={() => {
                if (
                  !_.isEqual(form.values, formInitialValues) &&
                  form.isValid()
                )
                  handleSave();
              }}
            />

            <FlowQuestionExtraProps
              form={form}
              question={question}
              handleSave={handleSave}
              nextScreens={nextScreens}
              extraConfigForm={extraConfigForm}
            />
          </Stack>
        </Group>
      </ScrollArea>
      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <Group>
            <Checkbox
              label={translations("Required")}
              fw={600}
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            {WaNPSQuestions.includes(question?.type as QuestionType) && (
              <Checkbox
                label={translations("NPS Analytics")}
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
                title={translations("Logic Jump")}
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
                title={translations("Google Review")}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
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
  // Ensure value is a string for the length tracker
  const safeValue = typeof props.value === "string" ? props.value : "";
  return (
    <TextInput
      variant="unstyled"
      placeholder="Enter question label here *"
      {...props}
      value={safeValue}
      styles={{
        input: {
          fontSize: "1.1rem",
          fontWeight: 400, // set custom font size for this TextInput
        },
      }}
      rightSection={
        <LengthTracker length={safeValue.length} maxValue={props.maxLength} />
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
  nextScreens?: WaFlowScreen[];
  extraConfigForm: UseFormReturnType<any>;
}
function FlowQuestionExtraProps({
  form,
  question,
  nextScreens,
  handleSave,
  extraConfigForm,
}: ExtraPropsProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const translations = useExtracted();
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
              {translations("Choices")}
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
    case QuestionType.Optin:
      return (
        <ContainedSelection
          data={nextScreens?.map((data) => ({
            label: data?.title,
            value: data?.id,
          }))}
          {...form.getInputProps("optinScreenId")}
          label={translations("Read more screen")}
          placeholder={translations("select next screen to show the details")}
          w={300}
        />
      );
    case QuestionType.Date:
      return (
        <Stack mt={"xs"}>
          <Switch
            size="md"
            label={translations("Enable dynamic datepicker")}
            {...form.getInputProps("onSelectAction", {
              type: "checkbox",
            })}
          />
          {form.values.onSelectAction && (
            <ContainedSelection
              label={translations("Integration App Name")}
              placeholder={translations("Select Integration App Name")}
              data={[IntegratedApps.amelia]}
              {...form.getInputProps("waAppName")}
              w={400}
            />
          )}
        </Stack>
      );
    case QuestionType.PhotoPicker:
      return (
        <SimpleGrid mt={"xs"} cols={2}>
          <Alert variant="light" color="blue" title="Info">
            {translations(
              "No more than 10 images or documents can be sent as part of the response message.",
            )}
          </Alert>
          <Alert variant="light" color="blue" title="Info">
            {translations(
              "Additionally, the maximum aggregated size of attached images or documents cannot exceed 100 MB.",
            )}
          </Alert>
          <ContainedSelection
            label={translations("Photo Source")}
            placeholder={translations("Select Photo Source")}
            description={translations(
              "source where the image can be selected from",
            )}
            data={Object.values(PhotoSource)}
            {...extraConfigForm.getInputProps("photo-source")}
          />
          <ContainedNumberInput
            label={translations("max file size in kb")}
            description={translations(
              "maximum file size (in kilobytes) that can be uploaded",
            )}
            placeholder={translations("max file size in kb")}
            min={1}
            max={25600}
            {...extraConfigForm.getInputProps("max-file-size-kb")}
          />
          <ContainedNumberInput
            label={translations("min uploaded photos")}
            description={translations(
              "minimum number of photos that are required",
            )}
            placeholder={translations("min uploaded photos")}
            min={0}
            max={30}
            {...extraConfigForm.getInputProps("min-uploaded-photos")}
          />
          <ContainedNumberInput
            label={translations("max uploaded photos")}
            description={translations(
              "maximum number of photos that can be uploaded",
            )}
            placeholder={translations("max uploaded photos")}
            min={1}
            max={30}
            {...extraConfigForm.getInputProps("max-uploaded-photos")}
          />
        </SimpleGrid>
      );
    case QuestionType.DocumentPicker:
      return (
        <SimpleGrid mt={"xs"} cols={2}>
          <Alert variant="light" color="blue" title="Info">
            {translations(
              "No more than 10 images or documents can be sent as part of the response message.",
            )}
          </Alert>
          <Alert variant="light" color="blue" title="Info">
            {translations(
              "Additionally, the maximum aggregated size of attached images or documents cannot exceed 100 MB.",
            )}
          </Alert>
          <ContainedNumberInput
            label={translations("max file size in kb")}
            description={translations(
              "maximum file size (in kilobytes) that can be uploaded",
            )}
            placeholder={translations("max file size in kb")}
            min={1}
            max={25600}
            {...extraConfigForm.getInputProps("max-file-size-kb")}
          />
          <ContainedNumberInput
            label={translations("min uploaded documents")}
            description={translations(
              "minimum number of documents that are required",
            )}
            placeholder={translations("min uploaded documents")}
            min={0}
            max={30}
            {...extraConfigForm.getInputProps("min-uploaded-documents")}
          />
          <ContainedNumberInput
            label={translations("max uploaded documents")}
            description={translations(
              "maximum number of documents that can be uploaded",
            )}
            placeholder={translations("max uploaded documents")}
            min={1}
            max={30}
            {...extraConfigForm.getInputProps("max-uploaded-documents")}
          />
          <ContainedMultiSelect
            label={translations("allowed mime types")}
            placeholder={translations("Select allowed mime types")}
            description={translations(
              "by default all the mime types are allowed",
            )}
            data={Object.entries(DocumentMimeType).map(([key, value]) => ({
              label: key,
              value: value,
            }))}
            {...extraConfigForm.getInputProps("allowed-mime-types")}
          />
        </SimpleGrid>
      );
    case QuestionType.Text:
      return (
        <>
          <ContainedSelection
            label={translations("Input Type")}
            placeholder={translations("Select Type")}
            data={Object.values(InputType)}
            {...extraConfigForm.getInputProps("input-type")}
          />
        </>
      );

    default:
      return null;
  }
}
