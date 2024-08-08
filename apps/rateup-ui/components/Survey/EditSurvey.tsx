import { useContext, useEffect, useState } from "react";

import { Button, Center, Flex, Stack, Tabs, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
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
import { createBlankQuestion, createPage } from "../../utils/questions";
import PaperLayout from "../styled/Layouts/PaperLayout";
import styles from "./EditSurvey.module.css";
import PageTypeSelection from "./Page/PageTypeSelection";
import GoogleReviewEditor from "./Question/GoogleReviewEditor";
import LogicEditor from "./Question/LogicEditor";
import { QuestionDetailedView } from "./Question/QuestionDetailedView";
import { QuestionTypeSelection } from "./Question/QuestionTypeSelection";
import SurveyVariableEditor from "./Question/SurveyVariableEditor";
import TicketIssueEditor from "./Question/TicketIssueEditor";
import ValidationRulesEditor from "./Question/ValidationRulesEditor";
import { QuestionsSideBar } from "./QuestionsSideBar";
import SurveyPreviewModal from "./SurveyPreviewModal";
import SurveyTheme from "./SurveyTheme";
import StylesComponent from "./SurveyTheme/components/stylescomponent";
import { ThemeTabEnum } from "./SurveyTheme/SurveyTheme.enums";
import { SurveyThemeContextProvider } from "./SurveyTheme/SurveyThemeContext";

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
}
interface EditSurveyProps {
  questions: Array<Question>;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  subscription: Subscription;
}
export function EditSurvey({
  questions,
  addQnTrigger,
  surveyLanguages,
  setSelectedLanguage,
  subscription,
}: EditSurveyProps) {
  const [activeTab, setActiveTab] = useState<QuestionTabsEnum>(
    QuestionTabsEnum.SurveyPreview,
  );
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const { surveyId } = useContext(SurveyContext);
  const { data: survey, dataUpdatedAt } = useSurvey(surveyId);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const [
    isSurveyPreviewModalOpen,
    { open: openSurveyPreviewModal, close: closeSurveyPreviewModal },
  ] = useDisclosure(false);

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
      setSelectedQ(r.data);
      setActiveTab(QuestionTabsEnum.Edit);
    });
  };

  let inititalSelectedTabForSurveyThemeComp = ThemeTabEnum.SURVEY;
  if (selectedQ?.type === PageType.Welcome) {
    inititalSelectedTabForSurveyThemeComp = ThemeTabEnum.WELCOME;
  } else if (selectedQ?.type === PageType.ThankYou) {
    inititalSelectedTabForSurveyThemeComp = ThemeTabEnum.THANKYOU;
  } else if (selectedQ?.type === PageType.Language) {
    inititalSelectedTabForSurveyThemeComp = ThemeTabEnum.LANGUAGE;
  }

  if (activeTab === QuestionTabsEnum.SurveyPreview) {
    inititalSelectedTabForSurveyThemeComp = ThemeTabEnum.SURVEY;
  }

  useEffect(() => {
    closeStylesEditorDrawer();
  }, [inititalSelectedTabForSurveyThemeComp]);

  useEffect(() => {
    closeStylesEditorDrawer();
  }, [activeTab]);

  return (
    <SurveyThemeContextProvider
      surveyTheme={survey?.webSurveyTheme?.theme}
      selectedPageTab={inititalSelectedTabForSurveyThemeComp}
    >
      <Flex className={styles["edit-survey-div"]}>
        <LayoutGroup>
          <motion.div
            className={styles["question-sidebar-container-motion-div"]}
            layout={"position"}
          >
            <PaperLayout className={styles["question-sidebar-container"]}>
              <QuestionsSideBar
                questions={questions}
                selectedQ={selectedQ}
                setSelectedQ={setSelectedQ}
                setActiveTab={setActiveTab}
                surveyLanguages={surveyLanguages}
                setSelectedLanguage={setSelectedLanguage}
                addQnTrigger={addQnTrigger}
                survey={survey}
              />
            </PaperLayout>
          </motion.div>

          <motion.div
            className={`${styles["question-editor-container-motion-div"]}`}
            layout={"position"}
          >
            <PaperLayout
              className={`${styles["question-editor-container"]} ${activeTab ? activeTab + "-QDV" : ""} ${selectedQ?.type ? selectedQ.type + "-QDV" : ""}`}
            >
              <Tabs
                value={activeTab}
                onChange={(tab) => setActiveTab(tab as QuestionTabsEnum)}
                style={{ height: "100%" }}
                classNames={{
                  panel: styles["panel"],
                }}
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
                              initialSelectedPageTab={
                                inititalSelectedTabForSurveyThemeComp
                              }
                              allThemesArr={allThemesArr}
                              themeSelectorState={themeSelectorState}
                              setThemeSelectorState={setThemeSelectorState}
                              isAllThemesFetchPending={isAllThemesFetchPending}
                              isThemeObjBeingEditedDefaultTheme={
                                isThemeObjBeingEditedDefaultTheme
                              }
                              themeObjBeingEdited={themeObjBeingEdited}
                              closeStylesEditorDrawer={closeStylesEditorDrawer}
                              openStylesEditorDrawer={openStylesEditorDrawer}
                              openSurveyPreviewModal={openSurveyPreviewModal}
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
                    <Text c="dimmed">Select a question to edit</Text>
                  </Center>
                </Tabs.Panel>
                <Tabs.Panel
                  className={styles["survey-preview-panel"]}
                  value={QuestionTabsEnum.SurveyPreview}
                >
                  {survey && activeTab === QuestionTabsEnum.SurveyPreview && (
                    <SurveyTheme
                      previewId={"survey-theme-edit-preview"}
                      key={surveyPreviewCompKey}
                      initialSelectedPageTab={
                        inititalSelectedTabForSurveyThemeComp
                      }
                      survey={survey}
                      allThemesArr={allThemesArr}
                      themeSelectorState={themeSelectorState}
                      setThemeSelectorState={setThemeSelectorState}
                      isAllThemesFetchPending={isAllThemesFetchPending}
                      isThemeObjBeingEditedDefaultTheme={
                        isThemeObjBeingEditedDefaultTheme
                      }
                      themeObjBeingEdited={themeObjBeingEdited}
                      closeStylesEditorDrawer={closeStylesEditorDrawer}
                      openStylesEditorDrawer={openStylesEditorDrawer}
                      openSurveyPreviewModal={openSurveyPreviewModal}
                      isSurveyThemeEditView={true}
                    />
                  )}
                </Tabs.Panel>
              </Tabs>
            </PaperLayout>
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
                transition={{ duration: 0.4, type: "tween" }}
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
                    closeStylesEditorDrawer={closeStylesEditorDrawer}
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
            initialSelectedPageTab={inititalSelectedTabForSurveyThemeComp}
            survey={survey}
            allThemesArr={allThemesArr}
            themeSelectorState={themeSelectorState}
            setThemeSelectorState={setThemeSelectorState}
            isAllThemesFetchPending={isAllThemesFetchPending}
            isThemeObjBeingEditedDefaultTheme={
              isThemeObjBeingEditedDefaultTheme
            }
            themeObjBeingEdited={themeObjBeingEdited}
            closeStylesEditorDrawer={closeStylesEditorDrawer}
            openStylesEditorDrawer={openStylesEditorDrawer}
            openSurveyPreviewModal={openSurveyPreviewModal}
          />
        </SurveyPreviewModal>
      </Flex>
    </SurveyThemeContextProvider>
  );
}
