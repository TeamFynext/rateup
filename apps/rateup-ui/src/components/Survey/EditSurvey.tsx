"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActionIcon,
  Box,
  Center,
  Flex,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLanguage } from "@tabler/icons-react";
import { isEqual } from "lodash";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

import { PageType, QuestionType, SurveyType } from "@/types/enums.ts";
import { useQuestionCreateMutation } from "@/backend/surveys/questions/questions.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useAllThemes } from "@/backend/surveyTheme/surveyTheme.query";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import {
  QuestionTypesGroup,
  uniquePages,
  WaSurveyQuestionTypes,
} from "@/utils/constants.ts";
import {
  createBlankQuestion,
  createPage,
  validateAllLanguagesArePopulated,
} from "@/utils/questions.ts";

import PaperLayout from "../styled/Layouts/PaperLayout.tsx";
import styles from "./EditSurvey.module.css";
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
import UiTextTranslationsModal from "./UiTextTranslationsModal/index.tsx";

const isQuestionType = (
  type: QuestionType | PageType | undefined,
): type is QuestionType =>
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
  const { t: translations } = useTranslation();
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
        !isEqual(
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
        !isEqual(
          survey?.webSurveyPagesTheme[themeObjKey],
          surveyThemeContextProviderValueRef.current[themeObjKey],
        )
      ) {
        return true;
      } else {
        return false;
      }
    } else if (isQuestionType(selectedQ?.type)) {
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
      <Flex className={styles["edit-survey-div"]}>
        <LayoutGroup>
          <motion.div
            className={styles["question-sidebar-container-motion-div"]}
            layout={"position"}
          >
            <Box className={styles["question-sidebar-container"]}>
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
            </Box>
          </motion.div>

          <motion.div
            className={`${styles["question-editor-container-motion-div"]}`}
            layout={"position"}
          >
            <Box
              className={`${styles["question-editor-container"]} ${activeTab ? activeTab + "-QDV" : ""} ${selectedQ?.type ? selectedQ.type + "-QDV" : ""}`}
            >
              <Tabs
                value={activeTab}
                onChange={(tab) => setActiveTab(tab as QuestionTabsEnum)}
                style={{ height: "100%" }}
                classNames={{
                  panel: styles["panel"],
                }}
                keepMounted={false}
              >
                <Tabs.Panel
                  value={QuestionTabsEnum.Edit}
                  className={styles["question-detailed-view-panel"]}
                >
                  {selectedQ && (
                    <>
                      {uniquePages.includes(selectedQ?.type as PageType) ? (
                        <Stack gap={"xs"} h={"100%"}>
                          {survey && (
                            <SurveyTheme
                              survey={survey}
                              previewId={`${selectedQ.type}-preview`}
                              onEditPageBtnClick={openStylesEditorDrawer}
                            />
                          )}
                        </Stack>
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
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.TypeSelection}>
                  <Stack className={styles["type-selection-panel-child-div"]}>
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
                  </Stack>
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.LogicEditor}>
                  {selectedQ && (
                    <LogicEditor
                      selectedQ={selectedQ}
                      setActiveTab={setActiveTab}
                      key={selectedQ.id}
                    />
                  )}
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.GoogleReviewEditor}>
                  <GoogleReviewEditor
                    selectedQ={selectedQ}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.QuestionReviewPageEditor}>
                  <QuestionReviewPageEditor
                    selectedQ={selectedQ}
                    survey={survey}
                    setActiveTab={setActiveTab}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.TicketIssueEditor}>
                  <TicketIssueEditor
                    selectedQ={selectedQ}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.ValidationRulesEditor}>
                  <ValidationRulesEditor
                    selectedQ={selectedQ}
                    setSelectedQ={setSelectedQ}
                    setActiveTab={setActiveTab}
                    activeTab={activeTab}
                  />
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.VariableEditor}>
                  <SurveyVariableEditor setActiveTab={setActiveTab} />
                </Tabs.Panel>
                <Tabs.Panel value={QuestionTabsEnum.None}>
                  <Center style={{ height: "100%" }}>
                    <Text c="dimmed">
                      {translations("Select a question to edit")}
                    </Text>
                  </Center>
                </Tabs.Panel>
                <Tabs.Panel
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
                    <ActionIcon
                      className={styles["ui-text-translations-modal-btn"]}
                      onClick={() => {
                        setIsUiTextTranlationsModalOpen(
                          !isUiTextTranslationsModalOpen,
                        );
                      }}
                    >
                      <IconLanguage size={20} />
                    </ActionIcon>
                  }
                </Tabs.Panel>
              </Tabs>
            </Box>
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
        </LayoutGroup>

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
      </Flex>
    </SurveyThemeContextProvider>
  );
}
