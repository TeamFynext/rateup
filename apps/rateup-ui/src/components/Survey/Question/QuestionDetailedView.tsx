import { Alert, Box, Divider, Group, Portal, ScrollArea, Stack } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconAlertOctagon, IconEye } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubscription } from "@/backend/subscription/subscription.query";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "@/backend/surveys/questions/questions.query";
import HTMLEditor from "@/components/RichTextEditor/HTMLEditor.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import {
  NPSWeightage,
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { deleteUploadedFiles } from "@/utils/file-upload/upload.ts";
import { getInitialQuestionValues, validateAllLanguagesArePopulated } from "@/utils/questions.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import TextEditor from "../../RichTextEditor/TextEditor.tsx";
import type { QuestionTabsEnum } from "../EditSurvey.tsx";
import ImportChoices from "./ImportChoices/index.tsx";
import { LanguageCompletionView } from "./LanguageCompletionView.tsx";
import QuestionTypePreview from "./Previews/QuestionTypePreview.tsx";
import QuestionDetailedViewBadge from "./QuestionDetailedViewBadge.tsx";
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

import styles from "./QuestionDetailedView.module.css";

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  surveyId?: string;
  survey: Survey;
  questionDetailedViewFormRef?: any;
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
}: QuestionDetailedViewProps) {
  const params = useParams({
    strict: false,
  });
  const surveyId = pSurveyId || (params.surveyId as string);
  const [isSaved, setIsSaved] = useState(true);
  const [currentResponse, updateResponse] = useState(null);
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

  useEffect(() => {
    setIsGoogleReviewFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.GoogleReview),
    );

    // Tickets are free with no limits — always available.
    setIsTicketFeatureActive(true);
  }, [subscription]);

  const form = useForm({
    initialValues: getInitialQuestionValues(question, surveyLanguages),
  });

  form.watch("choices", () => {
    if (!getIncompleteLanguages()?.length) {
      handleSave();
    }
  });

  form.watch("features", ({ previousValue, value }) => {
    if (JSON.stringify(previousValue) !== JSON.stringify(value) && !getIncompleteLanguages().length)
      handleSave();
  });

  useEffect(() => {
    form.setInitialValues(getInitialQuestionValues(question, surveyLanguages));
    form.reset();
  }, [question, surveyLanguages]);

  function getIncompleteLanguages() {
    return validateAllLanguagesArePopulated(form.getValues(), surveyLanguages, [
      "title",
      "choices",
    ]);
  }

  const { imageToDelete, resetImage } = useImageStore();
  const formRef = useRef<HTMLDivElement | null>(null);

  const handleSave = async () => {
    try {
      if (!form.values.title[selectedLanguage] || form.values.title[selectedLanguage] == "") {
        toast.error(translations("Question title is missing"));
        setIsSaved(false);
        return "error";
      } else {
        if (getIncompleteLanguages().length > 0) {
          setSelectedLanguage(getIncompleteLanguages()[0]);
          toast.error(
            translations("Please Enter heading and choices for all languages before saving."),
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
          questionCreateMutation.mutate(form.values, {
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
            data: form.getValues(),
          });
        }
      }

      return "saved";
    } catch {
      setDeleteFileLoading(false);
      return "no saved";
    }
  };

  useEffect(() => {
    if (form.isDirty()) handleSave();
  }, [form.values.required, form.values.enableNpsAnalytics]);

  useEffect(() => {
    if (questionDetailedViewFormRef) {
      questionDetailedViewFormRef.current = form.getValues();
    }
  }, [form]);

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending || deleteFileLoading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      style={{ height: "100%" }}
      onKeyDown={getHotkeyHandler([
        [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSave)(event)],
      ])}
    >
      <Portal target={"#SurveyIssueAlert"}>
        <SurveyIssueAlert isSaved={isSaved} />
      </Portal>
      <Stack style={{ height: "100%" }} ref={formRef}>
        <ScrollArea
          className={styles["editor-scroll-area-div"]}
          style={{ flex: "1 1 0" }}
          offsetScrollbars={"x"}
          styles={{ viewport: { paddingRight: "1rem" } }}
        >
          <QuestionDetailedViewBadge question={question} />
          <Group justify="space-between" p={2} gap={2} align="start" mt={"xs"}>
            <Stack
              style={{
                minHeight: "150px",
                height: "100%",
                flex: 1,
                overflow: "hidden",
              }}
              mr={"xs"}
            >
              <Group
                onBlur={async (e) => {
                  const currentTarget = e.currentTarget;
                  const relatedTarget = e.relatedTarget;
                  if (
                    !currentTarget.contains(relatedTarget) &&
                    getIncompleteLanguages()?.length === 0
                  ) {
                    if (form.isDirty()) await handleSave();
                  }
                }}
              >
                {question?.type === PageType.Custom ? (
                  <HTMLEditor
                    className={styles["html-editor-div"]}
                    form={form}
                    selectedLanguage={selectedLanguage}
                  />
                ) : (
                  <TextEditor
                    className={styles["rich-text-editor"]}
                    form={form}
                    selectedLanguage={selectedLanguage}
                  />
                )}
              </Group>

              <ExtraProps
                form={form}
                question={question}
                surveyType={SurveyType.Web}
                surveyLanguages={surveyLanguages}
                handleSave={handleSave}
              />
            </Stack>
            <LanguageCompletionView
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              languages={surveyLanguages}
              notCompletedLanguages={getIncompleteLanguages()}
            />
          </Group>
          <Divider
            my="xs"
            variant="dashed"
            labelPosition="center"
            label={
              <>
                <IconEye size={12} />
                <Box ml={5}>{translations("Preview")}</Box>
              </>
            }
          />

          <CurrentResponsesContext.Provider value={{ response: currentResponse, updateResponse }}>
            <QuestionTypePreview
              type={question?.type}
              choices={form.values.choices}
              features={form.values.features}
              tnc={form.values.tnc}
              wop={form.values?.wop}
              htmlContent={form?.values?.description[selectedLanguage] || null}
            />
          </CurrentResponsesContext.Provider>
        </ScrollArea>

        <Divider />

        <QuestionDetailedViewFooter
          question={question}
          form={form}
          setActiveTab={setActiveTab}
          isGoogleReviewFeatureActive={isGoogleReviewFeatureActive}
          handleSave={handleSave}
          isTicketFeatureActive={isTicketFeatureActive}
          getIncompleteLanguages={getIncompleteLanguages}
          selectedLanguage={selectedLanguage}
          isSaving={isSaving}
          enableAutoGenerateTicket={survey?.enableAutoGenerateTicket}
        />
      </Stack>
    </form>
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
            mantineFormObj={form}
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

const SurveyIssueAlert = ({ isSaved }: { isSaved: boolean }) => {
  const { t: translations } = useTranslation();

  if (isSaved) {
    return null;
  }

  const issueMessage = translations(
    "The survey contains incomplete questions. Please fix the issue.",
  );

  return (
    <Alert
      variant="light"
      color="red"
      title={translations("Issue with your survey")}
      icon={<IconAlertOctagon />}
      m={"xs"}
    >
      {issueMessage}
    </Alert>
  );
};
