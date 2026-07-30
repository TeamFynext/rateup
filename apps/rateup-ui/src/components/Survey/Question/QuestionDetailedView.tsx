import { IconAlertOctagon, IconDeviceSdCard, IconEye } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, type Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubscription } from "@/backend/subscription/subscription.query";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "@/backend/surveys/questions/questions.query";
import HTMLEditor from "@/components/RichTextEditor/HTMLEditor.tsx";
import { TipTapFloatingMenu } from "@/components/tiptap/extensions/floating-menu";
import { FloatingToolbar } from "@/components/tiptap/extensions/floating-toolbar";
import { ImageExtension } from "@/components/tiptap/extensions/image";
import { ImagePlaceholder } from "@/components/tiptap/extensions/image-placeholder";
import SearchAndReplace from "@/components/tiptap/extensions/search-and-replace";
import { EditorToolbar } from "@/components/tiptap/toolbars/editor-toolbar.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils";
import {
  NPSWeightage,
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "@/types/enums.ts";
import { getTypeLabel } from "@/utils/enums/index.ts";
import { deleteUploadedFiles } from "@/utils/file-upload/upload.ts";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
  validateContactFeaturesPopulated,
} from "@/utils/questions.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import type { QuestionTabsEnum } from "../EditSurvey.tsx";
import ImportChoices from "./ImportChoices/index.tsx";
import { LanguageCompletionView } from "./LanguageCompletionView.tsx";
import QuestionDetailedViewFooter from "./QuestionDetailedViewFooter.tsx";
import { ChoicesCreator } from "./QuestionExtraProps/ChoicesCreator.tsx";
import ContactExtraProps from "./QuestionExtraProps/ContactExtraProps.tsx";
import EmailOtpExtraProps from "./QuestionExtraProps/EmailOtpExtraProps.tsx";
import MCQGridExtraProps from "./QuestionExtraProps/MCQGridExtraProps.tsx";
import MultiTextInputExtraProps from "./QuestionExtraProps/MultiTextInputExtraProps.tsx";
import SmileyExtraProps from "./QuestionExtraProps/SmileyExtraProps.tsx";
import TestimonialExtraProps from "./QuestionExtraProps/TestimonialExtraProps.tsx";
import TncExtraProps from "./QuestionExtraProps/TncExtraProps.tsx";
import WOPExtraProps from "./QuestionExtraProps/WOPExtraProps.tsx";

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string | null>>;
  surveyId?: string;
  survey: Survey;
  questionDetailedViewFormRef?: any;
  openSurveyPreviewModal?: () => void;
}

export function QuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
  surveyId: pSurveyId,
  survey,
  questionDetailedViewFormRef,
  openSurveyPreviewModal,
}: QuestionDetailedViewProps) {
  const params = useParams({
    strict: false,
  });
  const surveyId = pSurveyId || (params.surveyId as string);
  const [isSaved, setIsSaved] = useState(true);
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });
  const { t: translations } = useTranslation();
  const { data: subscription } = useSubscription();
  const [isGoogleReviewFeatureActive, setIsGoogleReviewFeatureActive] = useState(false);
  const [isTicketFeatureActive, setIsTicketFeatureActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsGoogleReviewFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.GoogleReview) ?? false,
    );

    // Tickets are free with no limits — always available.
    setIsTicketFeatureActive(true);
  }, [subscription]);

  const form = useForm({
    defaultValues: getInitialQuestionValues(question, surveyLanguages),
  });
  const { setValue, getValues, watch, reset, formState } = form;

  // Reactive snapshot of all values — used for QuestionTypePreview and ExtraProps children
  const allValues = watch();

  // Mantine-compatible adapter for ExtraProps children not yet migrated to RHF
  const extraPropsForm = {
    values: allValues,
    setFieldValue: (path: string, value: any) =>
      setValue(path as any, value, { shouldDirty: true }),
    getValues: () => getValues(),
  };

  // Reset form when question ID or languages change.
  // Using question.id (primitive) instead of question (object) prevents a reset
  // on every React Query background refetch where the reference changes but data hasn't.
  useEffect(() => {
    reset(getInitialQuestionValues(question, surveyLanguages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, surveyLanguages]);

  function getIncompleteLanguages() {
    const values = getValues();
    const missing = validateAllLanguagesArePopulated(values, surveyLanguages, ["title", "choices"]);
    const missingContactFeatures = validateContactFeaturesPopulated(
      values as Question,
      surveyLanguages,
    );
    return Array.from(new Set([...missing, ...missingContactFeatures]));
  }

  const { imageToDelete, resetImage } = useImageStore();
  const formRef = useRef<HTMLDivElement | null>(null);

  const handleSave = async () => {
    try {
      const titleValues = getValues("title" as any);
      if (!titleValues?.[selectedLanguage] || titleValues[selectedLanguage] === "") {
        toast.error(translations("Question title is missing"));
        setIsSaved(false);
        return "error";
      } else {
        const incompleteLanguages = getIncompleteLanguages();
        if (incompleteLanguages.length > 0) {
          setSelectedLanguage(incompleteLanguages[0]);
          const missingContactFeatures = validateContactFeaturesPopulated(
            getValues() as Question,
            surveyLanguages,
          );
          toast.error(
            translations(
              missingContactFeatures.length > 0
                ? "Please select at least one field (Name, Phone or Email)."
                : "Please Enter heading and choices for all languages before saving.",
            ),
          );
          setIsSaved(false);
          return "error";
        }
        if (imageToDelete?.length > 0) {
          setDeleteFileLoading(true);
          await deleteUploadedFiles({ fileKeyArray: imageToDelete });
          setDeleteFileLoading(false);
          resetImage();
        }
        setIsSaved(true);

        // Checking if its a new question
        if (!question.id) {
          // Creating new question
          questionCreateMutation.mutate(getValues(), {
            onSuccess: (r) => {
              setSelectedQ(r.data);
              setIsSaved(true);
            },
          });
        } else {
          // Updating existing question
          toast.loading(translations("Hold on, your changes are getting updated.."), {
            id: "load-data",
          });
          questionUpdateMutation.mutate({
            qId: question.id,
            data: getValues(),
          });
        }
      }

      return "saved";
    } catch {
      setDeleteFileLoading(false);
      return "no saved";
    }
  };

  // Latest-ref pattern: always points to the current handleSave closure
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  // Auto-save when choices change (skip initial mount)
  const watchedChoices = watch("choices" as any);
  const isFirstChoicesRender = useRef(true);
  useEffect(() => {
    if (isFirstChoicesRender.current) {
      isFirstChoicesRender.current = false;
      return;
    }
    if (!getIncompleteLanguages()?.length) handleSaveRef.current?.();
  }, [watchedChoices]);

  // Auto-save when features change (prev-value comparison naturally skips first render)
  const watchedFeatures = watch("features" as any);
  const prevFeaturesStr = useRef(JSON.stringify(watchedFeatures));
  useEffect(() => {
    const current = JSON.stringify(watchedFeatures);
    if (prevFeaturesStr.current !== current) {
      prevFeaturesStr.current = current;
      if (!getIncompleteLanguages().length) handleSaveRef.current?.();
    }
  }, [watchedFeatures]);

  // Auto-save when required or enableNpsAnalytics change
  const watchedRequired = watch("required" as any);
  const watchedEnableNpsAnalytics = watch("enableNpsAnalytics" as any);
  useEffect(() => {
    if (formState.isDirty) handleSaveRef.current?.();
  }, [watchedRequired, watchedEnableNpsAnalytics]);

  // Keep the ref in sync with the latest form values on every render.
  // This is a plain ref mutation — safe to do directly during render,
  // no useEffect needed (avoids running an effect on every single render).
  if (questionDetailedViewFormRef) {
    questionDetailedViewFormRef.current = getValues();
  }

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending || deleteFileLoading;

  const questionTypeLabel = getTypeLabel(question.type) || "";

  const alertPortalTarget =
    mounted && typeof document !== "undefined" ? document.getElementById("SurveyIssueAlert") : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      style={{ height: "100%" }}
      onKeyDown={(e: React.KeyboardEvent) => {
        const isMod = e.metaKey || e.ctrlKey;
        if (isMod && e.key === "s") {
          e.preventDefault();
          handleSave();
        }
      }}
    >
      {alertPortalTarget && createPortal(<SurveyIssueAlert isSaved={isSaved} />, alertPortalTarget)}

      <div className="flex h-full flex-col" ref={formRef}>
        <div className="flex h-[54px] flex-shrink-0 items-center gap-3.5 border-b border-border bg-card px-4">
          {/* Question number badge */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-nunito text-sm font-black text-primary-foreground">
            {(survey?.questions?.findIndex((q: any) => q.id === question.id) ?? 0) + 1}
          </div>
          {/* Label */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {questionTypeLabel}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {translations("Question Editor")}
            </div>
          </div>
          {/* Language selector */}
          <LanguageCompletionView
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            languages={surveyLanguages}
            notCompletedLanguages={getIncompleteLanguages()}
          />
          {/* Footer controls inline */}
          <QuestionDetailedViewFooter
            question={question}
            required={watchedRequired}
            enableNpsAnalytics={watchedEnableNpsAnalytics}
            onRequiredChange={(checked) =>
              setValue("required" as any, checked, { shouldDirty: true })
            }
            onNpsAnalyticsChange={(checked) =>
              setValue("enableNpsAnalytics" as any, checked, { shouldDirty: true })
            }
            setActiveTab={setActiveTab}
            isGoogleReviewFeatureActive={isGoogleReviewFeatureActive}
            handleSave={handleSave}
            isTicketFeatureActive={isTicketFeatureActive}
            enableAutoGenerateTicket={survey?.enableAutoGenerateTicket}
            className="flex items-center gap-3 border-r border-border pr-3.5"
          />
          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-[7px] px-3 text-xs font-semibold"
            onClick={() => openSurveyPreviewModal?.()}
          >
            <IconEye className="size-3.5" />
            {translations("Preview")}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-[7px] px-3 text-xs font-semibold"
            onClick={handleSave}
            disabled={isSaving}
          >
            <IconDeviceSdCard className="size-3.5" />
            {translations("Save")}
          </Button>
        </div>
        <ScrollArea className={cn("min-h-0")} style={{ flex: "1 1 0" }}>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-start justify-between ">
              <div
                className="mr-2 flex flex-1 flex-col overflow-hidden"
                style={{ minHeight: "150px" }}
              >
                <div
                  className="mb-2"
                  onBlur={async (e) => {
                    const currentTarget = e.currentTarget;
                    const relatedTarget = e.relatedTarget;
                    if (
                      !currentTarget.contains(relatedTarget) &&
                      getIncompleteLanguages()?.length === 0
                    ) {
                      if (formState.isDirty) await handleSave();
                    }
                  }}
                >
                  {question?.type === PageType.Custom ? (
                    <HTMLEditor
                      titleValue={allValues?.title?.[selectedLanguage]}
                      descriptionValue={allValues?.description?.[selectedLanguage]}
                      onTitleChange={(v) =>
                        setValue(`title.${selectedLanguage}` as any, v, { shouldDirty: true })
                      }
                      onDescriptionChange={(v) =>
                        setValue(`description.${selectedLanguage}` as any, v, { shouldDirty: true })
                      }
                    />
                  ) : (
                    <QuestionTitleEditor
                      content={allValues?.title?.[selectedLanguage]}
                      onChange={(v) =>
                        setValue(`title.${selectedLanguage}` as any, v, { shouldDirty: true })
                      }
                      placeholder={
                        questionTypeLabel
                          ? `Enter your ${questionTypeLabel.toLowerCase()} question`
                          : "Enter your question"
                      }
                    />
                  )}
                </div>

                <ExtraProps
                  form={extraPropsForm}
                  question={question}
                  surveyType={SurveyType.Web}
                  surveyLanguages={surveyLanguages}
                  handleSave={handleSave}
                />
              </div>
            </div>

            {/* <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
              <IconEye size={12} />
              <span>{translations("Preview")}</span>
            </span>
            <Separator className="flex-1" />
          </div> */}

            {/* <CurrentResponsesContext.Provider value={{ response: currentResponse, updateResponse }}>
            <QuestionTypePreview
              type={question?.type}
              choices={allValues.choices}
              features={allValues.features}
              tnc={allValues.tnc}
              wop={allValues?.wop}
              htmlContent={allValues?.description?.[selectedLanguage] || null}
            />
          </CurrentResponsesContext.Provider> */}
          </div>
        </ScrollArea>
      </div>
    </form>
  );
}

export function getNpsColor(npstype: string) {
  switch (npstype) {
    case NPSWeightage.PROMOTER:
      return "green";
    case NPSWeightage.PASSIVE:
      return "yellow";
    case NPSWeightage.DETRACTOR:
      return "red";
    default:
      return "var(--primary)";
  }
}

interface ExtraPropsProps {
  form: any;
  question: Question;
  surveyType: SurveyType;
  surveyLanguages: string[];
  handleSave: () => void;
}
function ExtraProps({ form, question, surveyType, surveyLanguages, handleSave }: ExtraPropsProps) {
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
    case QuestionType.CustomNPS:
      return (
        <>
          <ImportChoices
            setValue={form.setFieldValue}
            surveyLanguagesArr={surveyLanguages}
            questionObj={question}
            handleSave={handleSave}
          />

          <ChoicesCreator qId={question?.id} form={form} surveyType={surveyType} />
        </>
      );
    case QuestionType.PCQ:
      return <ChoicesCreator qId={question?.id} form={form} image surveyType={surveyType} />;
    case QuestionType.Testimonial:
      return <TestimonialExtraProps form={form} />;
    case QuestionType.Contact:
    case QuestionType.Email:
    case QuestionType.Phone:
      return <ContactExtraProps form={form} />;
    case QuestionType.TnC:
      return <TncExtraProps form={form} />;
    case QuestionType.MultiTextInput:
      return <MultiTextInputExtraProps form={form} />;
    case QuestionType.MCQGrid:
      return <MCQGridExtraProps form={form} qId={question.id} />;
    case QuestionType.EmailOtp:
      return <EmailOtpExtraProps form={form} qId={question.id} surveyLanguages={surveyLanguages} />;
    case QuestionType.WOP:
      return <WOPExtraProps form={form} />;
    case QuestionType.Smiley:
      return <SmileyExtraProps form={form} />;
    default:
      return null;
  }
}

interface QuestionTitleEditorProps {
  content?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function QuestionTitleEditor({
  content,
  onChange,
  className = "",
  placeholder = "Enter your question",
}: QuestionTitleEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc",
          },
        },
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder.configure({
        emptyNodeClass: "is-editor-empty",
        placeholder,
        includeChildren: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Subscript,
      Superscript,
      Underline,
      Link,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      ImageExtension,
      ImagePlaceholder,
      SearchAndReplace,
      Typography,
    ] as Extension[],
    content,
    editorProps: {
      attributes: {
        class: "max-w-full focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (content ?? "")) {
      editor.commands.setContent(content ?? "");
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-md border bg-card", className)}>
      <EditorToolbar editor={editor} />
      <FloatingToolbar editor={editor} />
      <TipTapFloatingMenu editor={editor} />
      <EditorContent editor={editor} className="min-h-[120px] w-full min-w-full cursor-text p-3" />
    </div>
  );
}

const SurveyIssueAlert = ({ isSaved }: { isSaved: boolean }) => {
  const { t: translations } = useTranslation();

  if (isSaved) {
    return null;
  }

  return (
    <Alert variant="destructive" className="m-2">
      <IconAlertOctagon />
      <AlertTitle>{translations("Issue with your survey")}</AlertTitle>
      <AlertDescription>
        {translations("The survey contains incomplete questions. Please fix the issue.")}
      </AlertDescription>
    </Alert>
  );
};
