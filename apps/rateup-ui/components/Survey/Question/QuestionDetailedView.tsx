import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import { Box, Divider, Group, ScrollArea, Stack } from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEye } from "@tabler/icons-react";

import HTMLEditor from "@/components/RichTextEditor/HTMLEditor";

import { useSubscription } from "../../../backend/subscription/subscription.query";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  NPSWeightage,
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "../../../types/enums";
import { SAVE_HOTKEY } from "../../../utils/constants";
import { deleteUploadedFiles } from "../../../utils/file-upload/upload";
import { showErrorToast } from "../../../utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../utils/questions";
import { hasFeature } from "../../../utils/subscription/subscription";
import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import TextEditor from "../../RichTextEditor/TextEditor";
import { QuestionTabsEnum } from "../EditSurvey";
import ImportChoices from "./ImportChoices";
import { LanguageCompletionView } from "./LanguageCompletionView";
import QuestionTypePreview from "./Previews/QuestionTypePreview";
import styles from "./QuestionDetailedView.module.css";
import QuestionDetailedViewBadge from "./QuestionDetailedViewBadge";
import QuestionDetailedViewFooter from "./QuestionDetailedViewFooter";
import { ChoicesCreator } from "./QuestionExtraProps/ChoicesCreator";
import ContactExtraProps from "./QuestionExtraProps/ContactExtraProps";
import EmailOtpExtraProps from "./QuestionExtraProps/EmailOtpExtraProps";
import MCQGridExtraProps from "./QuestionExtraProps/MCQGridExtraProps";
import MultiTextInputExtraProps from "./QuestionExtraProps/MultiTextInputExtraProps";
import TestimonialExtraProps from "./QuestionExtraProps/TestimonialExtraProps";
import TncExtraProps from "./QuestionExtraProps/TncExtraProps";
import WOPExtraProps from "./QuestionExtraProps/WOPExtraProps";

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
}
export function QuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
  surveyId,
  survey,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  surveyId = surveyId || (router.query?.surveyId as string);

  const [currentResponse, updateResponse] = useState(null);
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const { data: subscription } = useSubscription();
  const [isGoogleReviewFeatureActive, setIsGoogleReviewFeatureActive] =
    useState(false);
  const [isTicketFeatureActive, setIsTicketFeatureActive] = useState(false);

  useEffect(() => {
    setIsGoogleReviewFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.GoogleReview),
    );

    setIsTicketFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    );
  }, [subscription]);

  const form = useForm({
    initialValues: getInitialQuestionValues(question, surveyLanguages),
  });

  form.watch("choices", ({ previousValue, value, touched, dirty }) => {
    if (!getIncompleteLanguages()?.length) {
      handleSave();
    }
  });

  form.watch("features", ({ previousValue, value, touched, dirty }) => {
    if (
      JSON.stringify(previousValue) !== JSON.stringify(value) &&
      !getIncompleteLanguages().length
    )
      handleSave();
  });

  useEffect(() => {
    form.setInitialValues(getInitialQuestionValues(question, surveyLanguages));
    form.reset();
  }, [question, surveyLanguages]);

  function getIncompleteLanguages() {
    return validateAllLanguagesArePopulated(
      form.getValues() as Question,
      surveyLanguages,
      ["title", "choices"],
    );
  }

  const { imageToDelete, resetImage } = useImageStore();
  const formRef = useRef<HTMLDivElement | null>(null);

  const handleSave = async () => {
    try {
      if (
        !form.values.title[selectedLanguage] ||
        form.values.title[selectedLanguage] == ""
      ) {
        showErrorToast("Question title is missing");
        return "error";
      } else {
        if (getIncompleteLanguages().length > 0) {
          setSelectedLanguage(getIncompleteLanguages()[0]);
          showErrorToast(
            "Please Enter heading and choices for all languages before saving.",
          );
          return "error";
        }
        if (imageToDelete?.length > 0) {
          setDeleteFileLoading(true);
          await deleteUploadedFiles({ fileKeyArray: imageToDelete });
          setDeleteFileLoading(false);
          resetImage();
        }

        // Checking if its a new question
        if (!question.id) {
          // Creating new question
          questionCreateMutation.mutate(form.values, {
            onSuccess: (r) => {
              setSelectedQ(r.data);
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
    } catch (error) {
      setDeleteFileLoading(false);
      return "no saved";
    }
  };

  useEffect(() => {
    if (form.isDirty()) handleSave();
  }, [form.values.required, form.values.enableNpsAnalytics]);

  const isSaving =
    questionCreateMutation.isPending ||
    questionUpdateMutation.isPending ||
    deleteFileLoading;
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
                <Box ml={5}>Preview</Box>
              </>
            }
          />

          <CurrentResponsesContext.Provider
            value={{ response: currentResponse, updateResponse }}
          >
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
function ExtraProps({
  form,
  question,
  surveyType,
  surveyLanguages,
  handleSave,
}: ExtraPropsProps) {
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

          <ChoicesCreator
            qId={question?.id}
            form={form}
            surveyType={surveyType}
          />
        </>
      );
    case QuestionType.PCQ:
      return <ChoicesCreator qId={question?.id} form={form} image />;
    case QuestionType.Testimonial:
      return <TestimonialExtraProps qId={question.id} form={form} />;
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
      return (
        <EmailOtpExtraProps
          form={form}
          qId={question.id}
          surveyLanguages={surveyLanguages}
        />
      );
    case QuestionType.WOP:
      return <WOPExtraProps form={form} />;
    default:
      return null;
  }
}
