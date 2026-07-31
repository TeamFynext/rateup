import { IconEye, IconSearch } from "@tabler/icons-react";
import { isEqual } from "lodash";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

import { useQuestionCreateMutation } from "@/backend/surveys/questions/questions.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useAllThemes } from "@/backend/surveyTheme/surveyTheme.query";
import type { ElementType } from "@/components/Survey/Question/QuestionTypeSelection.tsx";
import type { SurveyThemePage } from "@/components/Survey/SurveyTheme/surveyThemeReducer.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { cn } from "@/lib/utils";
import { PageType, QuestionType, SurveyType } from "@/types/enums.ts";
import { QuestionTypesGroup, uniquePages, WaSurveyQuestionTypes } from "@/utils/constants.ts";
import { getTypeLabel } from "@/utils/enums/index.ts";
import {
  createBlankQuestion,
  createPage,
  validateAllLanguagesArePopulated,
  validateContactFeaturesPopulated,
} from "@/utils/questions.ts";

import PageTypeSelection from "./Page/PageTypeSelection.tsx";
import GoogleReviewEditor from "./Question/GoogleReviewEditor.tsx";
import LogicEditor from "./Question/LogicEditor.tsx";
import { QuestionDetailedView } from "./Question/QuestionDetailedView.tsx";
import QuestionReviewPageEditor from "./Question/QuestionReviewPageEditor/index.tsx";
import { QuestionTypeSelection } from "./Question/QuestionTypeSelection.tsx";
import SurveyVariableEditor from "./Question/SurveyVariableEditor.tsx";
import TicketIssueEditor from "./Question/TicketIssueEditor.tsx";
import ValidationRulesEditor from "./Question/ValidationRulesEditor.tsx";
import { QuestionsSideBar } from "./QuestionsSideBar.tsx";
import SurveyPreviewModal from "./SurveyPreviewModal.tsx";
import StylesComponent from "./SurveyTheme/components/stylescomponent/index.tsx";
import SurveyTheme from "./SurveyTheme/index.tsx";
import {
  getSurveyThemeKeyFromPageType,
  getSurveyThemeTabValueFromPageType,
} from "./SurveyTheme/SurveyTheme.constants";
import { ThemeTabEnum } from "./SurveyTheme/SurveyTheme.enums";
import { SurveyThemeContextProvider } from "./SurveyTheme/SurveyThemeContext.tsx";

const isQuestionType = (type: QuestionType | PageType | undefined): type is QuestionType =>
  Object.values(QuestionType).includes(type as QuestionType);

export enum QuestionTabsEnum {
  Edit = "Edit",
  TypeSelection = "TypeSelection",
  LogicEditor = "LogicEditor",
  GoogleReviewEditor = "GoogleReviewEditor",
  ValidationRulesEditor = "ValidationRulesEditor",
  TicketIssueEditor = "TicketIssueEditor",
  VariableEditor = "VariableEditor",
  None = "None",
  QuestionReviewPageEditor = "QuestionReviewPageEditor",
}
interface EditSurveyProps {
  questions: Array<Question>;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string | null>>;
  subscription?: Subscription;
  setFunToRunBeforeSurveyIdPageHeaderTabsChange: any;
}

export function EditSurvey({
  questions,
  addQnTrigger,
  surveyLanguages,
  setSelectedLanguage,
  subscription,
  setFunToRunBeforeSurveyIdPageHeaderTabsChange,
}: EditSurveyProps) {
  const [activeTab, setActiveTab] = useState<QuestionTabsEnum>(QuestionTabsEnum.None);
  const { surveyId } = useContext(SurveyContext);
  const { data: survey } = useSurvey(surveyId ?? "");
  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const [selectedSurveyThemeTab, setSelectedSurveyThemeTab] = useState(ThemeTabEnum.SURVEY);
  const [surveyThemeContextValue, setSurveyThemeContextValue] = useState(
    survey?.webSurveyTheme?.theme,
  );

  // To store questionDetailedViewForm State.
  const questionDetailedViewFormRef = useRef<Question | null>(null);

  // To store state of surveyThemeContextProvider.
  const surveyThemeContextProviderValueRef = useRef<Record<string, SurveyThemePage> | null>(null);

  // Search text for the "Add Element" catalogue.
  const [elementQuery, setElementQuery] = useState("");

  const [isSurveyPreviewModalOpen, setIsSurveyPreviewModalOpen] = useState(false);
  const openSurveyPreviewModal = () => setIsSurveyPreviewModalOpen(true);
  const closeSurveyPreviewModal = () => setIsSurveyPreviewModalOpen(false);
  const { t: translations } = useTranslation();
  // used to rerender survey theme preview, when questions reoredered or deleted and when survey changes.
  const [surveyPreviewCompKey, setSurveyPreveiwCompKey] = useState(uuidv4());

  // selected surveyThemeId.
  const [themeSelectorState, setThemeSelectorState] = useState(survey?.webSurveyThemeId);

  const { data: allThemesArr, isPending: isAllThemesFetchPending } = useAllThemes();

  const themeObjBeingEdited = allThemesArr?.find(
    (obj: { id: string }) => obj.id === themeSelectorState,
  );
  const isThemeObjBeingEditedDefaultTheme = themeObjBeingEdited?.name === "Default Theme";

  const [isStylesEditorDrawerOpen, setIsStylesEditorDrawerOpen] = useState(false);
  const openStylesEditorDrawer = () => setIsStylesEditorDrawerOpen(true);
  const closeStylesEditorDrawer = () => setIsStylesEditorDrawerOpen(false);

  const checkForUnsavedChanges = useCallback(() => {
    if (uniquePages.includes(selectedQ?.type as PageType)) {
      const themeObjKey = getSurveyThemeKeyFromPageType(selectedQ!.type)!;
      if (
        !isEqual(
          survey?.webSurveyPagesTheme[themeObjKey],
          surveyThemeContextProviderValueRef.current?.[themeObjKey],
        )
      ) {
        return true;
      } else {
        return false;
      }
    } else if (isQuestionType(selectedQ?.type)) {
      if (questionDetailedViewFormRef.current) {
        const missingLanguages = validateAllLanguagesArePopulated(
          questionDetailedViewFormRef.current,
          surveyLanguages,
          ["title", "choices"],
        );
        const missingContactFeatures = validateContactFeaturesPopulated(
          questionDetailedViewFormRef.current,
          surveyLanguages,
        );
        return missingLanguages?.length > 0 || missingContactFeatures?.length > 0;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }, [
    surveyThemeContextValue,
    survey,
    themeSelectorState,
    selectedQ,
    activeTab,
    // Note: ref.current values are intentionally NOT listed here.
    // Refs are stable mutable containers — .current is always up-to-date
    // when read inside the callback without needing to be a dependency.
  ]);

  // Whether the current question's unsaved-changes state is specifically the
  // Contact question's "no field enabled" case, so callers can show that
  // message instead of the generic one.
  const hasContactFeatureIssue = useCallback(() => {
    if (!questionDetailedViewFormRef.current) return false;
    return (
      validateContactFeaturesPopulated(
        questionDetailedViewFormRef.current as Question,
        surveyLanguages,
      ).length > 0
    );
  }, [surveyLanguages]);

  useEffect(() => {
    if (uniquePages.includes(selectedQ?.type as PageType)) {
      setSurveyThemeContextValue(survey?.webSurveyPagesTheme);
    }
  }, [survey]);

  useEffect(() => {
    const newKey = uuidv4();
    setSurveyPreveiwCompKey(newKey);
  }, [survey, questions]);

  useEffect(() => {
    if (!selectedQ) return;
    if (questions && selectedQ.id) {
      const Q = questions.find((q) => q.id === selectedQ.id);
      if (Q) {
        setSelectedQ(Q);
      } else {
        setSelectedQ(null);
      }
    }
  }, [questions]);

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId: surveyId ?? "",
  });

  const handleTypeSelection = (type: ElementType) => {
    if (type in PageType) {
      // Page types (Welcome/ThankYou/etc.) get valid default titles, so it's
      // safe to persist them immediately.
      const newQ = createPage(type as PageType, surveyLanguages);
      questionCreateMutation.mutateAsync(newQ).then((r) => {
        const question = r.data;
        if (uniquePages.includes(question.type)) {
          setSelectedSurveyThemeTab(getSurveyThemeTabValueFromPageType(question.type)!);
          setSurveyThemeContextValue(survey?.webSurveyPagesTheme);
          surveyThemeContextProviderValueRef.current = survey?.webSurveyPagesTheme ?? null;
        }
        setSelectedQ(question);
        setActiveTab(QuestionTabsEnum.Edit);
      });
    } else {
      // Blank questions have no title yet, so don't persist them until the
      // user fills in the required fields — QuestionDetailedView creates the
      // question via questionCreateMutation on first valid save (id-less question).
      const newQ = createBlankQuestion(type as QuestionType, surveyLanguages);
      setSelectedQ(newQ);
      setActiveTab(QuestionTabsEnum.Edit);
    }
  };

  useEffect(() => {
    if (selectedSurveyThemeTab !== ThemeTabEnum.SURVEY) {
      closeStylesEditorDrawer();
    }
  }, [selectedSurveyThemeTab]);

  useEffect(() => {
    if (activeTab !== QuestionTabsEnum.Edit) {
      closeStylesEditorDrawer();
    }
  }, [activeTab]);

  useEffect(() => {
    setFunToRunBeforeSurveyIdPageHeaderTabsChange(() => {
      return () => {
        const haveUnsavedChanges = checkForUnsavedChanges();
        let feedbackElement = "modal";
        if (haveUnsavedChanges && isQuestionType(selectedQ?.type)) {
          feedbackElement = "toast";
        }
        if (haveUnsavedChanges) {
          return {
            haveUnsavedChanges,
            feedbackElement,
            toastMessage: "Please Enter heading and choices for all languages",
          };
        }
      };
    });
    return () => {
      setFunToRunBeforeSurveyIdPageHeaderTabsChange(null);
    };
  }, [checkForUnsavedChanges, setFunToRunBeforeSurveyIdPageHeaderTabsChange, selectedQ]);

  return (
    <SurveyThemeContextProvider
      surveyTheme={surveyThemeContextValue ?? {}}
      selectedPageTab={selectedSurveyThemeTab}
      editSurveySelectedQuestion={selectedQ}
      surveyThemeContextProviderValueRef={surveyThemeContextProviderValueRef}
    >
      <div
        className={cn(
          "relative flex h-full w-full overflow-hidden bg-muted",
          "[&_.survey-theme-root-div]:gap-2.5 [&_.survey-theme-root-div]:overflow-auto",
          "[&_.survey-theme-root-div_.selected-page-tab-panels-and-styles-div-container]:h-full",
          "[&_.survey-theme-root-div_.selected-page-tab-panels-and-styles-div-container]:flex-initial",
          "[&_.theme-preview-container]:w-full [&_.theme-preview-container]:flex-initial",
        )}
      >
        <LayoutGroup>
          <motion.div
            className="h-full w-[290px] shrink-0 overflow-hidden border-r"
            layout={"position"}
          >
            <div className="h-full bg-background">
              <QuestionsSideBar
                questions={questions}
                selectedQ={selectedQ}
                setSelectedQ={setSelectedQ}
                setActiveTab={setActiveTab}
                surveyLanguages={surveyLanguages}
                setSelectedLanguage={setSelectedLanguage}
                addQnTrigger={addQnTrigger}
                survey={survey!}
                setSurveyThemeContextValue={setSurveyThemeContextValue}
                setSelectedSurveyThemeTab={setSelectedSurveyThemeTab}
                checkForUnsavedChanges={checkForUnsavedChanges}
                hasContactFeatureIssue={hasContactFeatureIssue}
              />
            </div>
          </motion.div>

          <motion.div className="h-full flex-1 overflow-hidden" layout={"position"}>
            <div
              className={cn(
                "h-full bg-muted",
                activeTab && `${activeTab}-QDV`,
                selectedQ?.type && `${selectedQ.type}-QDV`,
              )}
            >
              <div className="h-full">
                {activeTab === QuestionTabsEnum.Edit && (
                  <div className="h-full [&>div]:h-full">
                    {selectedQ && (
                      <>
                        {uniquePages.includes(selectedQ?.type as PageType) ? (
                          <div className="flex flex-col h-full">
                            <div className="flex h-[54px] flex-shrink-0 items-center gap-3.5 border-b border-[#ECECEA] bg-white px-4">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rateup-blue-4 font-nunito text-sm font-black text-white">
                                {(survey?.questions?.findIndex((q: any) => q.id === selectedQ.id) ??
                                  0) + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold text-[#1A1B1A]">
                                  {getTypeLabel(selectedQ.type)}
                                </div>
                                <div className="text-[11px] text-[#8B8E8A]">Page Editor</div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 rounded-[7px] border-[1.5px] border-[#ECECEA] px-3 text-xs font-semibold text-[#4A4C49] hover:bg-gray-50"
                                onClick={() => openSurveyPreviewModal()}
                              >
                                <IconEye className="size-3.5" />
                                {translations("Preview")}
                              </Button>
                            </div>
                            {survey && (
                              <SurveyTheme
                                survey={survey!}
                                previewId={`${selectedQ.type}-preview`}
                                onEditPageBtnClick={openStylesEditorDrawer}
                              />
                            )}
                          </div>
                        ) : (
                          <QuestionDetailedView
                            survey={survey!}
                            question={selectedQ!}
                            setSelectedQ={setSelectedQ}
                            setActiveTab={setActiveTab}
                            surveyLanguages={surveyLanguages}
                            setSelectedLanguage={setSelectedLanguage}
                            key={selectedQ!.id}
                            questionDetailedViewFormRef={questionDetailedViewFormRef}
                            openSurveyPreviewModal={openSurveyPreviewModal}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
                {activeTab === QuestionTabsEnum.TypeSelection && (
                  <div className="flex h-full flex-col bg-card">
                    <div className="flex h-13.5 shrink-0 items-center gap-3.5 border-b border-border px-5.5">
                      <span className="shrink-0 font-nunito text-[17px] font-extrabold text-foreground">
                        {translations("Add Element")}
                      </span>
                      <div className="relative max-w-md flex-1">
                        <IconSearch className="absolute top-1/2 left-3 size-3.75 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={elementQuery}
                          onChange={(event) => setElementQuery(event.target.value)}
                          placeholder={translations("Search elements...")}
                          className="h-9 pl-8.5 text-[13px]"
                        />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-5 overflow-auto px-5.5 py-4.5">
                      {survey?.type === SurveyType.Web && (
                        <PageTypeSelection
                          questions={questions}
                          handleTypeSelection={handleTypeSelection}
                          subscription={subscription!}
                          query={elementQuery}
                        />
                      )}
                      <QuestionTypeSelection
                        questionTypeGroups={
                          survey?.type === SurveyType.WhatsApp
                            ? WaSurveyQuestionTypes
                            : QuestionTypesGroup
                        }
                        handleTypeSelection={handleTypeSelection}
                        query={elementQuery}
                      />
                    </div>
                  </div>
                )}
                {activeTab === QuestionTabsEnum.LogicEditor && selectedQ && (
                  <LogicEditor
                    selectedQ={selectedQ!}
                    setActiveTab={setActiveTab}
                    key={selectedQ!.id}
                  />
                )}
                {activeTab === QuestionTabsEnum.GoogleReviewEditor && (
                  <GoogleReviewEditor
                    selectedQ={selectedQ!}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                  />
                )}
                {activeTab === QuestionTabsEnum.QuestionReviewPageEditor && (
                  <QuestionReviewPageEditor
                    selectedQ={selectedQ!}
                    survey={survey!}
                    setActiveTab={setActiveTab}
                  />
                )}
                {activeTab === QuestionTabsEnum.TicketIssueEditor && (
                  <TicketIssueEditor
                    selectedQ={selectedQ!}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                  />
                )}
                {activeTab === QuestionTabsEnum.ValidationRulesEditor && (
                  <ValidationRulesEditor
                    selectedQ={selectedQ!}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                    activeTab={activeTab}
                  />
                )}
                {activeTab === QuestionTabsEnum.VariableEditor && (
                  <SurveyVariableEditor setActiveTab={setActiveTab} />
                )}
                {activeTab === QuestionTabsEnum.None && (
                  <div className="flex h-full flex-col">
                    <div className="flex h-[54px] flex-shrink-0 items-center gap-3.5 border-b border-border bg-card px-4">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-foreground">
                          {survey?.title}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 rounded-[7px] px-3 text-xs font-semibold"
                        onClick={() => openSurveyPreviewModal()}
                      >
                        <IconEye className="size-3.5" />
                        {translations("Preview")}
                      </Button>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm text-muted-foreground">
                        {translations("Select a question to edit")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          {isStylesEditorDrawerOpen && (
            <AnimatePresence>
              <motion.div
                layout
                className="h-full w-80 shrink-0 border-l"
                initial={{ x: 500 }}
                animate={{ x: 0 }}
                exit={{ x: 500 }}
              >
                <Card className="h-full rounded-none border-0 p-0">
                  <StylesComponent
                    survey={survey!}
                    isThemeObjBeingEditedDefaultTheme={isThemeObjBeingEditedDefaultTheme}
                    themeObjBeingEdited={themeObjBeingEdited}
                    onClose={() => {
                      closeStylesEditorDrawer();
                    }}
                    allThemesArr={allThemesArr}
                    themeSelectorState={themeSelectorState}
                    setThemeSelectorState={setThemeSelectorState}
                    isAllThemesFetchPending={isAllThemesFetchPending}
                  />
                </Card>
              </motion.div>
            </AnimatePresence>
          )}
        </LayoutGroup>

        {/* absolute overlay: takes the in-place Mantine modal (withinPortal=false) out of flex flow */}
        <div
          className={cn(
            "absolute inset-0 bg-background",
            isSurveyPreviewModalOpen ? "z-[999] pointer-events-auto" : "-z-[1] pointer-events-none",
          )}
        >
          <SurveyPreviewModal opened={isSurveyPreviewModalOpen} onClose={closeSurveyPreviewModal}>
            <SurveyTheme
              key={"preview" + surveyPreviewCompKey}
              previewId={"survey-theme-prod-preview"}
              survey={survey!}
              isSurveyThemePreview
            />
          </SurveyPreviewModal>
        </div>
      </div>
    </SurveyThemeContextProvider>
  );
}
