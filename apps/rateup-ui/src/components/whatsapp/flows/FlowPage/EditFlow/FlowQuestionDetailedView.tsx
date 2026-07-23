import { zodResolver } from "@hookform/resolvers/zod";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { isEqual } from "lodash";
import { useContext, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "@/backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { TextareaWithLengthTracker } from "@/components/input/TextareaWithLengthTracker.tsx";
import GoogleReviewEditor from "@/components/Survey/Question/GoogleReviewEditor.tsx";
import { ChoicesCreator } from "@/components/Survey/Question/QuestionExtraProps/ChoicesCreator.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  getFlowLabelLimit,
  getFlowOptionsLimit,
  WA_FLOW_BODY_CHAR_LIMIT,
  WA_FLOW_HEADING_CHAR_LIMIT,
} from "@/components/whatsapp/whatsappConfig.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import {
  DocumentMimeType,
  InputType,
  IntegratedApps,
  PhotoSource,
  QuestionType,
  SurveyType,
  WaFlowFormElementType,
  WaFlowStatus,
} from "@/types/enums.ts";
import type { WaFlowScreen } from "@/types/global";
import { SAVE_HOTKEY, WaNPSQuestions } from "@/utils/constants.ts";
import { googleReviewSupportedTypes, logicSupportedTypes } from "@/utils/data.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import { getInitialQuestionValues, validateAllLanguagesArePopulated } from "@/utils/questions.ts";
import { toSelectOptions } from "@/utils/select-options.ts";
import { getFlowTextLimit, questionTypeToFlowFormElementType } from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext.ts";
import { FlowLogicEditor } from "./FlowLogicEditor.tsx";

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
  const [activeEditor, setActiveEditor] = useState<EditorType>(EditorType.ElementEditor);

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
      return <FlowLogicEditor afterSave={() => setActiveEditor(EditorType.ElementEditor)} />;
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
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { selectedScreenId, flowJson } = useContext(EditFlowContext);

  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });
  const currentIndex = flowJson.screens.findIndex((s) => s.id === selectedScreenId);
  const nextScreens = flowJson.screens.slice(currentIndex + 1);

  const labelMaxLength = getFlowLabelLimit(
    questionTypeToFlowFormElementType(question.type as QuestionType),
  );
  const { t: translations } = useTranslation();
  function validateLabel(value: string) {
    if (!value) return translations("Label is required");
    if (value.trim().length > labelMaxLength) {
      return `Max ${labelMaxLength} characters allowed`;
    }
  }

  const formInitialValues = getInitialQuestionValues(question, surveyLanguages, SurveyType.WaFlow);
  const form = useForm<any>({
    defaultValues: formInitialValues,
  });
  const values = form.watch();

  /**
   * Validates the fields of the language currently being edited and writes the results
   * onto the form. Kept synchronous — `handleSave` returns "saved" / "error" to its
   * callers, so it cannot await RHF's async `trigger()`.
   */
  /** Writes a `<field>.<language>` path; these are built from the active locale. */
  const setLocalised = (path: string, value: unknown) =>
    form.setValue(path, value, { shouldDirty: true });

  const validateSelectedLanguage = () => {
    const current = form.getValues();
    const issues: Array<[string, string]> = [];

    const title = current.title?.[selectedLanguage] ?? "";
    if (title.trim().length > WA_FLOW_HEADING_CHAR_LIMIT) {
      issues.push(["title", `Max ${WA_FLOW_HEADING_CHAR_LIMIT} characters allowed`]);
    }
    const description = current.description?.[selectedLanguage] ?? "";
    if (description.trim().length > WA_FLOW_BODY_CHAR_LIMIT) {
      issues.push(["description", `Max ${WA_FLOW_BODY_CHAR_LIMIT} characters allowed`]);
    }
    const labelError = validateLabel(current.label?.[selectedLanguage]);
    if (labelError) issues.push(["label", labelError]);

    form.clearErrors(["title", "description", "label"]);
    for (const [name, message] of issues) {
      form.setError(name, { type: "validation", message });
    }
    return issues.length === 0;
  };

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
          message: translations("Minimum uploaded photos cannot be greater than maximum"),
          input: values["min-uploaded-photos"],
        });
      } else if (values["min-uploaded-documents"] > values["max-uploaded-documents"]) {
        ctx.issues.push({
          path: ["min-uploaded-documents"],
          code: "custom",
          message: translations("Minimum uploaded documents cannot be greater than maximum"),
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

  const extraConfigForm = useForm<any>({
    resolver: zodResolver(fileSchema) as any,
    defaultValues: {
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
      extraConfigForm.reset({ ...extraConfigForm.getValues(), ...question.extraConfig });
    }
  }, [question.extraConfig]);

  const watchedChoices = form.watch("choices");
  const choicesInitialised = useRef(false);
  useEffect(() => {
    if (!choicesInitialised.current) {
      choicesInitialised.current = true;
      return;
    }
    handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedChoices]);

  function getIncompleteLanguages() {
    return validateAllLanguagesArePopulated(form.getValues(), surveyLanguages, ["choices"]);
  }
  // Copy of handleSave from QuestionDetailedView.tsx
  const handleSave = () => {
    if (!flowEditable) {
      toast.error(translations("Published Flows cannot be edited"));
      return;
    }

    // Form validation
    if (!validateSelectedLanguage()) {
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
      if (!fileSchema.safeParse(extraConfigForm.getValues()).success) return "error";

      toast.dismiss();
      const updatedValues = getUpdatedValues();
      form.setValue("extraConfig", updatedValues, { shouldDirty: true });
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
    const allExtraConfig = extraConfigForm.getValues();
    const extraConfigValues = (() => {
      switch (question.type) {
        case QuestionType.PhotoPicker:
          return {
            "photo-source": allExtraConfig["photo-source"],
            "max-file-size-kb": allExtraConfig["max-file-size-kb"],
            "min-uploaded-photos": allExtraConfig["min-uploaded-photos"],
            "max-uploaded-photos": allExtraConfig["max-uploaded-photos"],
          };
        case QuestionType.DocumentPicker:
          return {
            "max-file-size-kb": allExtraConfig["max-file-size-kb"],
            "min-uploaded-documents": allExtraConfig["min-uploaded-documents"],
            "max-uploaded-documents": allExtraConfig["max-uploaded-documents"],
            "allowed-mime-types": allExtraConfig["allowed-mime-types"],
          };
        case QuestionType.Text:
        case QuestionType.Email:
        case QuestionType.Phone:
          return {
            "input-type": allExtraConfig["input-type"],
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
          toast.success(translations("Your question was updated successfully"), {
            id: "load-data",
          });
        },
      },
    );
  };

  const isSaving = questionCreateMutation.isPending || questionUpdateMutation.isPending;

  const rawLabelValue = values.label?.[selectedLanguage];
  // Ensure value is always a string (handle undefined, null, or non-string values)
  const labelValue = typeof rawLabelValue === "string" ? rawLabelValue : "";
  // TODO: defer error checking until user has entered some text
  const labelError = validateLabel(labelValue);

  useEffect(() => {
    if (formInitialValues.required !== values.required && validateSelectedLanguage()) handleSave();
  }, [values.required]);

  return (
    <div
      className="flex flex-col justify-between"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSave]])}
    >
      <ScrollArea className="h-4/5">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{question.type}</Badge>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 pr-10">
          <div
            className="flex flex-col gap-0 p-3"
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "clip",
              flex: 1,
            }}
          >
            {question.type !== QuestionType.Optin && (
              <>
                <TextareaWithLengthTracker
                  inputStyle={{
                    fontSize: "1.75rem",
                    fontWeight: 700, // set custom font size for this TextInput
                  }}
                  style={{
                    marginBottom: "20px", // add 30px bottom margin
                  }}
                  className="max-h-24 overflow-y-auto border-none bg-transparent px-0 shadow-none"
                  placeholder={translations("Enter question title here")}
                  maxValue={getFlowTextLimit(WaFlowFormElementType.textSubHeading)}
                  value={values.title?.[selectedLanguage] ?? ""}
                  onChange={(event) =>
                    setLocalised(`title.${selectedLanguage}`, event.target.value)
                  }
                  onBlur={() => {
                    if (!isEqual(values, formInitialValues) && validateSelectedLanguage())
                      handleSave();
                  }}
                />

                <TextareaWithLengthTracker
                  className="max-h-48 overflow-y-auto border-none bg-transparent px-0 shadow-none"
                  placeholder={translations("Enter question description here")}
                  value={values.description?.[selectedLanguage] ?? ""}
                  onChange={(event) =>
                    setLocalised(`description.${selectedLanguage}`, event.target.value)
                  }
                  inputStyle={{
                    fontSize: "1.1rem",
                    fontWeight: 400, // set custom font size for this TextInput
                  }}
                  maxValue={getFlowTextLimit(WaFlowFormElementType.textBody)}
                  onBlur={() => {
                    if (!isEqual(values, formInitialValues) && validateSelectedLanguage())
                      handleSave();
                  }}
                />
              </>
            )}
            <LabelTextInput
              value={labelValue}
              onChange={(e) => setLocalised(`label.${selectedLanguage}`, e.target.value)}
              error={labelError}
              maxLength={labelMaxLength}
              onBlur={() => {
                if (!isEqual(values, formInitialValues) && validateSelectedLanguage()) handleSave();
              }}
            />

            <FlowQuestionExtraProps
              form={form}
              question={question}
              nextScreens={nextScreens}
              extraConfigForm={extraConfigForm}
            />
          </div>
        </div>
      </ScrollArea>
      <div className="flex flex-col">
        <Separator />
        <div className="flex items-center justify-between p-2.5 px-3">
          <div className="flex items-center">
            <Label className="flex items-center gap-2 font-semibold">
              <Checkbox
                checked={!!values?.required}
                onCheckedChange={(checked) =>
                  form.setValue("required", !!checked, { shouldDirty: true })
                }
              />
              {translations("Required")}
            </Label>
            {WaNPSQuestions.includes(question?.type as QuestionType) && (
              <Label className="flex items-center gap-2 font-semibold">
                <Checkbox
                  checked={!!values?.enableNpsAnalytics}
                  onCheckedChange={(checked) =>
                    form.setValue("enableNpsAnalytics", !!checked, { shouldDirty: true })
                  }
                />
                {translations("NPS Analytics")}
              </Label>
            )}
          </div>
          <div className="flex items-center">
            {logicSupportedTypes.includes(question?.type as QuestionType) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const save = handleSave();
                  if (save === "saved") {
                    setActiveTab(EditorType.LogicEditor);
                  }
                }}
              >
                <img
                  src={`${import.meta.env.VITE_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                  className="h-7.5 w-7.5 object-contain"
                  alt="image of logic jump"
                />
                {translations("Logic Jump")}
              </Button>
            )}
            {/* TODO: Implement Custom Validation*/}
            {googleReviewSupportedTypes.includes(question?.type as QuestionType) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const save = handleSave();
                  if (save === "saved") {
                    setActiveTab(EditorType.GoogleReviewEditor);
                  }
                }}
              >
                <IconBrandGoogle size={"1rem"} stroke={4} />
                {translations("Google Review")}
              </Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <IconDeviceSdCard />}
            {getIncompleteLanguages().length > 1 ||
            (getIncompleteLanguages().length > 0 &&
              getIncompleteLanguages()[0] !== selectedLanguage)
              ? "Fill Next Language"
              : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LabelTextInput(
  props: React.ComponentProps<"input"> & { maxLength: number; error?: React.ReactNode },
) {
  // Ensure value is a string for the length tracker
  const safeValue = typeof props.value === "string" ? props.value : "";
  return (
    <InputGroup className="border-none shadow-none">
      <InputGroupInput
        placeholder="Enter question label here *"
        {...props}
        value={safeValue}
        style={{ fontSize: "1.1rem", fontWeight: 400 }}
      />
      <InputGroupAddon align="inline-end" className="min-w-20">
        <LengthTracker length={safeValue.length} maxValue={props.maxLength} />
      </InputGroupAddon>
    </InputGroup>
  );
}

interface ExtraPropsProps {
  form: UseFormReturn<any>;
  question: Question;
  nextScreens?: WaFlowScreen[];
  extraConfigForm: UseFormReturn<any>;
}
function FlowQuestionExtraProps({
  form,
  question,
  nextScreens,
  extraConfigForm,
}: Readonly<ExtraPropsProps>) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { t: translations } = useTranslation();
  const nextScreenOptions = toSelectOptions(
    nextScreens?.map((data) => ({ label: data?.title, value: data?.id })),
  );
  const integrationAppOptions = toSelectOptions([IntegratedApps.amelia]);
  const photoSourceOptions = toSelectOptions(Object.values(PhotoSource));
  const inputTypeOptions = toSelectOptions(Object.values(InputType));
  const mimeTypeOptions = toSelectOptions(
    Object.entries(DocumentMimeType).map(([key, value]) => ({ label: key, value })),
  );
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
    case QuestionType.CustomNPS:
      const maxChoiceCount = getFlowOptionsLimit(questionTypeToFlowFormElementType(question.type));
      return (
        <div className="flex flex-col gap-0 mt-8">
          <div className="flex items-center justify-between">
            <p className="font-bold text-muted-foreground">{translations("Choices")}</p>
            <Separator className="grow" />
            <LengthTracker
              length={form.watch().choices?.[selectedLanguage]?.length || 0}
              maxValue={maxChoiceCount}
            />
          </div>
          <div className="pl-2.5">
            <ChoicesCreator
              qId={question.id}
              form={form}
              maxCharCount={30}
              maxChoiceCount={maxChoiceCount}
            />
          </div>
        </div>
      );
    case QuestionType.Optin:
      return (
        <Field className="w-75">
          <FieldLabel>{translations("Read more screen")}</FieldLabel>
          <Select
            items={nextScreenOptions}
            value={form.watch("optinScreenId") ?? ""}
            onValueChange={(value) => form.setValue("optinScreenId", value, { shouldDirty: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={translations("select next screen to show the details")} />
            </SelectTrigger>
            <SelectContent>
              {nextScreenOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    case QuestionType.Date:
      return (
        <div className="flex flex-col mt-2.5">
          <Label className="flex items-center gap-2">
            <Switch
              checked={!!form.watch().onSelectAction}
              onCheckedChange={(checked) =>
                form.setValue("onSelectAction", !!checked, { shouldDirty: true })
              }
            />
            {translations("Enable dynamic datepicker")}
          </Label>
          {form.watch().onSelectAction && (
            <Field className="w-100">
              <FieldLabel>{translations("Integration App Name")}</FieldLabel>
              <Select
                items={integrationAppOptions}
                value={form.watch("waAppName") ?? ""}
                onValueChange={(value) => form.setValue("waAppName", value, { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={translations("Select Integration App Name")} />
                </SelectTrigger>
                <SelectContent>
                  {integrationAppOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      );
    case QuestionType.PhotoPicker:
      return (
        <div className="mt-2.5 grid grid-cols-2 gap-4">
          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              {translations(
                "No more than 10 images or documents can be sent as part of the response message.",
              )}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              {translations(
                "Additionally, the maximum aggregated size of attached images or documents cannot exceed 100 MB.",
              )}
            </AlertDescription>
          </Alert>
          <Field>
            <FieldLabel>{translations("Photo Source")}</FieldLabel>
            <Select
              items={photoSourceOptions}
              value={extraConfigForm.watch("photo-source") ?? ""}
              onValueChange={(value) =>
                extraConfigForm.setValue("photo-source", value, { shouldDirty: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={translations("Select Photo Source")} />
              </SelectTrigger>
              <SelectContent>
                {photoSourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {translations("source where the image can be selected from")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{translations("max file size in kb")}</FieldLabel>
            <Input
              type="number"
              min={1}
              max={25600}
              placeholder={translations("max file size in kb")}
              value={extraConfigForm.watch("max-file-size-kb") ?? ""}
              onChange={(event) =>
                extraConfigForm.setValue("max-file-size-kb", Number(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldDescription>
              {translations("maximum file size (in kilobytes) that can be uploaded")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{translations("min uploaded photos")}</FieldLabel>
            <Input
              type="number"
              min={0}
              max={30}
              placeholder={translations("min uploaded photos")}
              value={extraConfigForm.watch("min-uploaded-photos") ?? ""}
              onChange={(event) =>
                extraConfigForm.setValue("min-uploaded-photos", Number(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldDescription>
              {translations("minimum number of photos that are required")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{translations("max uploaded photos")}</FieldLabel>
            <Input
              type="number"
              min={1}
              max={30}
              placeholder={translations("max uploaded photos")}
              value={extraConfigForm.watch("max-uploaded-photos") ?? ""}
              onChange={(event) =>
                extraConfigForm.setValue("max-uploaded-photos", Number(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldDescription>
              {translations("maximum number of photos that can be uploaded")}
            </FieldDescription>
          </Field>
        </div>
      );
    case QuestionType.DocumentPicker:
      return (
        <div className="mt-2.5 grid grid-cols-2 gap-4">
          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              {translations(
                "No more than 10 images or documents can be sent as part of the response message.",
              )}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              {translations(
                "Additionally, the maximum aggregated size of attached images or documents cannot exceed 100 MB.",
              )}
            </AlertDescription>
          </Alert>
          <Field>
            <FieldLabel>{translations("max file size in kb")}</FieldLabel>
            <Input
              type="number"
              min={1}
              max={25600}
              placeholder={translations("max file size in kb")}
              value={extraConfigForm.watch("max-file-size-kb") ?? ""}
              onChange={(event) =>
                extraConfigForm.setValue("max-file-size-kb", Number(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldDescription>
              {translations("maximum file size (in kilobytes) that can be uploaded")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{translations("min uploaded documents")}</FieldLabel>
            <Input
              type="number"
              min={0}
              max={30}
              placeholder={translations("min uploaded documents")}
              value={extraConfigForm.watch("min-uploaded-documents") ?? ""}
              onChange={(event) =>
                extraConfigForm.setValue("min-uploaded-documents", Number(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldDescription>
              {translations("minimum number of documents that are required")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{translations("max uploaded documents")}</FieldLabel>
            <Input
              type="number"
              min={1}
              max={30}
              placeholder={translations("max uploaded documents")}
              value={extraConfigForm.watch("max-uploaded-documents") ?? ""}
              onChange={(event) =>
                extraConfigForm.setValue("max-uploaded-documents", Number(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldDescription>
              {translations("maximum number of documents that can be uploaded")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{translations("allowed mime types")}</FieldLabel>
            <MultiSelect
              options={mimeTypeOptions}
              value={extraConfigForm.watch("allowed-mime-types") ?? []}
              onValueChange={(value) =>
                extraConfigForm.setValue("allowed-mime-types", value, { shouldDirty: true })
              }
              placeholder={translations("Select allowed mime types")}
            />
            <FieldDescription>
              {translations("by default all the mime types are allowed")}
            </FieldDescription>
          </Field>
        </div>
      );
    case QuestionType.Text:
      return (
        <>
          <Field>
            <FieldLabel>{translations("Input Type")}</FieldLabel>
            <Select
              items={inputTypeOptions}
              value={extraConfigForm.watch("input-type") ?? ""}
              onValueChange={(value) =>
                extraConfigForm.setValue("input-type", value, { shouldDirty: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={translations("Select Type")} />
              </SelectTrigger>
              <SelectContent>
                {inputTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      );

    default:
      return null;
  }
}
