"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useDisclosure } from "@mantine/hooks";
import { IconLanguage } from "@tabler/icons-react";
import _ from "lodash";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { v4 as uuidv4 } from "uuid";

import { useAllThemes } from "@/backend/surveyTheme/surveyTheme.query";

import { useQuestionCreateMutation } from "../../backend/surveys/questions/questions.query";
import { useSurvey } from "../../backend/surveys/surveys.query";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import SurveyContext from "../../context/SurveyContext";
import { PageType, QuestionType, SurveyType } from "../../types/enums";
import {
  QuestionTypesGroup,
  uniquePages,
  WaSurveyQuestionTypes,
} from "../../utils/constants";
import {
  createBlankQuestion,
  createPage,
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../utils/questions";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { Button } from "../ui/button";
import { Tabs, TabsContent } from "../ui/tabs";
import styles from "./EditSurvey.module.css";
import PageTypeSelection from "./Page/PageTypeSelection";
import GoogleReviewEditor from "./Question/GoogleReviewEditor";
import LogicEditor from "./Question/LogicEditor";
import { QuestionDetailedView } from "./Question/QuestionDetailedView";
import QuestionReviewPageEditor from "./Question/QuestionReviewPageEditor";
import { QuestionTypeSelection } from "./Question/QuestionTypeSelection";
import SurveyVariableEditor from "./Question/SurveyVariableEditor";
import TicketIssueEditor from "./Question/TicketIssueEditor";
import ValidationRulesEditor from "./Question/ValidationRulesEditor";
import { QuestionsSideBar } from "./QuestionsSideBar";
import SurveyPreviewModal from "./SurveyPreviewModal";
import SurveyTheme from "./SurveyTheme";
import StylesComponent from "./SurveyTheme/components/stylescomponent";
import {
  getSurveyThemeKeyFromPageType,
  getSurveyThemeTabValueFromPageType,
} from "./SurveyTheme/SurveyTheme.constants";
import { ThemeTabEnum } from "./SurveyTheme/SurveyTheme.enums";
import { SurveyThemeContextProvider } from "./SurveyTheme/SurveyThemeContext";
import UiTextTranslationsModal from "./UiTextTranslationsModal";

export enum QuestionTabsEnum {
  Edit = "Edit",
  TypeSelection = "TypeSelection",
  LogicEditor = "LogicEditor",
  GoogleReviewEditor = "GoogleReviewEditor",
  ValidationRulesEditor = "ValidationRulesEditor",
  TicketIssueEditor = "TicketIssueEditor",
  VariableEditor = "VariableEditor",
  None = "None",
  SurveyPreview = "SurveyPreview",
  QuestionReviewPageEditor = "QuestionReviewPageEditor",
}
interface EditSurveyProps {
  questions: Array<Question>;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  subscription: Subscription;
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
  const [activeTab, setActiveTab] = useState<QuestionTabsEnum>(
    QuestionTabsEnum.None,
  );
  const { surveyId } = useContext(SurveyContext);
  const { data: survey, dataUpdatedAt } = useSurvey(surveyId);
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [selectedSurveyThemeTab, setSelectedSurveyThemeTab] = useState(
    ThemeTabEnum.SURVEY,
  );
  const [surveyThemeContextValue, setSurveyThemeContextValue] = useState(
    survey?.webSurveyTheme?.theme,
  );

  // To store questionDetailedViewForm State.
  const questionDetailedViewFormRef = useRef(null);

  // To store state of surveyThemeContextProvider.
  const surveyThemeContextProviderValueRef = useRef(null);

  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [isUiTextTranslationsModalOpen, setIsUiTextTranlationsModalOpen] =
    useState(false);

  const handleUiTextTranslationsModalClose = useCallback(() => {
    setIsUiTextTranlationsModalOpen(false);
  }, [isUiTextTranslationsModalOpen]);

  const [
    isSurveyPreviewModalOpen,
    { open: openSurveyPreviewModal, close: closeSurveyPreviewModal },
  ] = useDisclosure(false);
  const translations = useTranslations();
  // used to rerender survey theme preview, when questions reoredered or deleted and when survey changes.
  const [surveyPreviewCompKey, setSurveyPreveiwCompKey] = useState(uuidv4());

  // selected surveyThemeId.
  const [themeSelectorState, setThemeSelectorState] = useState(
    survey?.webSurveyThemeId,
  );

  const { data: allThemesArr, isPending: isAllThemesFetchPending } =
    useAllThemes();

  const themeObjBeingEdited = allThemesArr?.find(
    (obj) => obj.id === themeSelectorState,
  );
  const isThemeObjBeingEditedDefaultTheme =
    themeObjBeingEdited?.name === "Default Theme";

  const [
    isStylesEditorDrawerOpen,
    {
      open: openStylesEditorDrawer,
      close: closeStylesEditorDrawer,
      toggle: toggleStylesEditorDrawer,
    },
  ] = useDisclosure(false);

  const checkForUnsavedChanges = useCallback(() => {
    if (!selectedQ && activeTab === QuestionTabsEnum.SurveyPreview) {
      if (
        themeSelectorState !== survey?.webSurveyThemeId ||
        !_.isEqual(
          surveyThemeContextProviderValueRef.current,
          survey?.webSurveyTheme?.theme,
        )
      ) {
        return true;
      } else {
        return false;
      }
    } else if (uniquePages.includes(selectedQ?.type as PageType)) {
      const themeObjKey = getSurveyThemeKeyFromPageType(selectedQ?.type);
      if (
        !_.isEqual(
          survey?.webSurveyPagesTheme[themeObjKey],
          surveyThemeContextProviderValueRef.current[themeObjKey],
        )
      ) {
        return true;
      } else {
        return false;
      }
    } else if (
      Object.values(QuestionType).includes(selectedQ?.type as QuestionType)
    ) {
      if (questionDetailedViewFormRef.current) {
        const missingLanguages = validateAllLanguagesArePopulated(
          questionDetailedViewFormRef.current as Question,
          surveyLanguages,
          ["title", "choices"],
        );
        return missingLanguages?.length > 0;
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
    surveyThemeContextProviderValueRef.current,
    questionDetailedViewFormRef.current,
  ]);

  useEffect(() => {
    if (uniquePages.includes(selectedQ?.type as PageType)) {
      setSurveyThemeContextValue(survey?.webSurveyPagesTheme);
    } else if (activeTab === QuestionTabsEnum.SurveyPreview) {
      setSurveyThemeContextValue(survey?.webSurveyTheme?.theme);
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
    surveyId,
  });

  const handleTypeSelection = (type: QuestionType | PageType) => {
    let newQ;
    if (type in PageType) {
      newQ = createPage(type as PageType, surveyLanguages);
    } else {
      newQ = createBlankQuestion(type as QuestionType, surveyLanguages);
    }
    const { id, ...restData } = newQ;
    const saveQ = { ...restData };
    questionCreateMutation.mutateAsync(saveQ).then((r) => {
      const question = r.data;
      if (uniquePages.includes(question.type)) {
        setSelectedSurveyThemeTab(
          getSurveyThemeTabValueFromPageType(question.type),
        );
        setSurveyThemeContextValue(survey?.webSurveyPagesTheme);
        surveyThemeContextProviderValueRef.current =
          survey?.webSurveyPagesTheme;
      }
      setSelectedQ(question);
      setSelectedQ(r.data);
      setActiveTab(QuestionTabsEnum.Edit);
    });
  };

  useEffect(() => {
    if (selectedSurveyThemeTab !== ThemeTabEnum.SURVEY) {
      closeStylesEditorDrawer();
    }
  }, [selectedSurveyThemeTab]);

  useEffect(() => {
    if (activeTab !== QuestionTabsEnum.SurveyPreview) {
      closeStylesEditorDrawer();
    }
  }, [activeTab]);

  useEffect(() => {
    setFunToRunBeforeSurveyIdPageHeaderTabsChange(() => {
      return () => {
        const haveUnsavedChanges = checkForUnsavedChanges();
        let feedbackElement = "modal";
        if (
          haveUnsavedChanges &&
          Object.values(QuestionType).includes(selectedQ?.type as QuestionType)
        ) {
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
  }, [
    checkForUnsavedChanges,
    setFunToRunBeforeSurveyIdPageHeaderTabsChange,
    selectedQ,
  ]);

  return (
    <SurveyThemeContextProvider
      surveyTheme={surveyThemeContextValue}
      selectedPageTab={selectedSurveyThemeTab}
      editSurveySelectedQuestion={selectedQ}
      surveyThemeContextProviderValueRef={surveyThemeContextProviderValueRef}
    >
      <div className="flex gap-4 w-full h-[80vh]">
        <div className="flex gap-4 w-full">
          <div>
            <QuestionsSideBar
              questions={questions}
              selectedQ={selectedQ}
              setSelectedQ={setSelectedQ}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
              surveyLanguages={surveyLanguages}
              setSelectedLanguage={setSelectedLanguage}
              addQnTrigger={addQnTrigger}
              survey={survey}
              openStylesEditorDrawer={openStylesEditorDrawer}
              openSurveyPreviewModal={openSurveyPreviewModal}
              setSurveyThemeContextValue={setSurveyThemeContextValue}
              setSelectedSurveyThemeTab={setSelectedSurveyThemeTab}
              setThemeSelectorState={setThemeSelectorState}
              checkForUnsavedChanges={checkForUnsavedChanges}
            />
          </div>

          <motion.div
            className={`h-full overflow-hidden flex-1 border p-3 rounded-xl`}
          >
            <div
              className={`h-full flex-1 ${activeTab ? activeTab + "-QDV" : ""} ${selectedQ?.type ? selectedQ.type + "-QDV" : ""}`}
            >
              <Tabs
                className="h-full overflow-auto"
                value={activeTab}
                onValueChange={(tab) => setActiveTab(tab as QuestionTabsEnum)}
              >
                <TabsContent value={QuestionTabsEnum.Edit}>
                  {selectedQ && (
                    <>
                      {uniquePages.includes(selectedQ?.type as PageType) ? (
                        <div className="h-full flex-1">
                          {survey && (
                            <SurveyTheme
                              survey={survey}
                              previewId={`${selectedQ.type}-preview`}
                              onEditPageBtnClick={openStylesEditorDrawer}
                            />
                          )}
                        </div>
                      ) : (
                        <QuestionDetailedView
                          survey={survey}
                          question={selectedQ}
                          setSelectedQ={setSelectedQ}
                          setActiveTab={setActiveTab}
                          surveyLanguages={surveyLanguages}
                          setSelectedLanguage={setSelectedLanguage}
                          key={selectedQ.id}
                          questionDetailedViewFormRef={
                            questionDetailedViewFormRef
                          }
                        />
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.TypeSelection}>
                  <div className={"h-full"}>
                    {survey?.type === SurveyType.Web && (
                      <PageTypeSelection
                        questions={questions}
                        handleTypeSelection={handleTypeSelection}
                        subscription={subscription}
                      />
                    )}

                    <QuestionTypeSelection
                      questionTypeGroups={
                        survey?.type === SurveyType.WhatsApp
                          ? WaSurveyQuestionTypes
                          : QuestionTypesGroup
                      }
                      handleTypeSelection={handleTypeSelection}
                    />
                  </div>
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.LogicEditor}>
                  {selectedQ && (
                    <LogicEditor
                      selectedQ={selectedQ}
                      setActiveTab={setActiveTab}
                      key={selectedQ.id}
                    />
                  )}
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.GoogleReviewEditor}>
                  <GoogleReviewEditor
                    selectedQ={selectedQ}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                  />
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.QuestionReviewPageEditor}>
                  <QuestionReviewPageEditor
                    selectedQ={selectedQ}
                    survey={survey}
                    setActiveTab={setActiveTab}
                  />
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.TicketIssueEditor}>
                  <TicketIssueEditor
                    selectedQ={selectedQ}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                  />
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.ValidationRulesEditor}>
                  <ValidationRulesEditor
                    selectedQ={selectedQ}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                    activeTab={activeTab}
                  />
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.VariableEditor}>
                  <SurveyVariableEditor setActiveTab={setActiveTab} />
                </TabsContent>
                <TabsContent value={QuestionTabsEnum.None}>
                  <div className="flex items-center justify-center h-full">
                    <p className="opacity-60">
                      {translations("Select a question to edit")}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent
                  className={styles["survey-edit-view-panel"]}
                  value={QuestionTabsEnum.SurveyPreview}
                >
                  {survey && (
                    <SurveyTheme
                      previewId={"survey-theme-edit-preview"}
                      key={surveyPreviewCompKey}
                      survey={survey}
                      isSurveyThemeEditView={true}
                      onEditPageBtnClick={openStylesEditorDrawer}
                    />
                  )}

                  {
                    <Button
                      onClick={() => {
                        setIsUiTextTranlationsModalOpen(
                          !isUiTextTranslationsModalOpen,
                        );
                      }}
                    >
                      hellllllllllo
                      <IconLanguage size={20} />
                    </Button>
                  }
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
          {isStylesEditorDrawerOpen && (
            <AnimatePresence>
              <motion.div
                layout
                className={
                  styles["edit-survey-theme-style-component-motion-div"]
                }
                initial={{ x: 500 }}
                animate={{ x: 0 }}
                exit={{ x: 500 }}
              >
                <PaperLayout
                  className={styles["edit-survey-theme-style-component-div"]}
                >
                  <StylesComponent
                    survey={survey}
                    isThemeObjBeingEditedDefaultTheme={
                      isThemeObjBeingEditedDefaultTheme
                    }
                    themeObjBeingEdited={themeObjBeingEdited}
                    onClose={() => {
                      closeStylesEditorDrawer();
                    }}
                    allThemesArr={allThemesArr}
                    themeSelectorState={themeSelectorState}
                    setThemeSelectorState={setThemeSelectorState}
                    isAllThemesFetchPending={isAllThemesFetchPending}
                  />
                </PaperLayout>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <SurveyPreviewModal
          opened={isSurveyPreviewModalOpen}
          onClose={closeSurveyPreviewModal}
        >
          <SurveyTheme
            key={"preview" + surveyPreviewCompKey}
            previewId={"survey-theme-prod-preview"}
            survey={survey}
            isSurveyThemePreview
          />
        </SurveyPreviewModal>

        <UiTextTranslationsModal
          survey={survey}
          opened={isUiTextTranslationsModalOpen}
          onClose={handleUiTextTranslationsModalClose}
        />
      </div>
    </SurveyThemeContextProvider>
  );
}
