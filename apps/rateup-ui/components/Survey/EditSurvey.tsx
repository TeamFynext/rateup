import { Center, Text, Tabs, Flex, Stack } from "@mantine/core";
import { QuestionDetailedView } from "./Question/QuestionDetailedView";
import { QuestionTypeSelection } from "./Question/QuestionTypeSelection";
import { QuestionsSideBar } from "./QuestionsSideBar";
import { useContext, useEffect, useState } from "react";
import LogicEditor from "./Question/LogicEditor";
import GoogleReviewEditor from "./Question/GoogleReviewEditor";
import ValidationRulesEditor from "./Question/ValidationRulesEditor";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { MotionTransition } from "../animation/MotionTransition";
import styles from "./EditSurvey.module.css";
import { useSurvey } from "../../backend/surveys/surveys.query";
import SurveyContext from "../../context/SurveyContext";
import { PageType, QuestionType, SurveyType } from "../../types/enums";
import {
  QuestionTypesGroup,
  WaSurveyQuestionTypes,
} from "../../utils/constants";
import { useQuestionCreateMutation } from "../../backend/surveys/questions/questions.query";
import { createBlankQuestion, createPage } from "../../utils/questions";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import TicketIssueEditor from "./Question/TicketIssueEditor";
import SurveyVariableEditor from "./Question/SurveyVariableEditor";
import PageTypeSelection from "./Question/PageTypeSelection";

export enum QuestionTabsEnum {
  Edit = "Edit",
  TypeSelection = "TypeSelection",
  LogicEditor = "LogicEditor",
  GoogleReviewEditor = "GoogleReviewEditor",
  ValidationRulesEditor = "ValidationRulesEditor",
  TicketIssueEditor = "TicketIssueEditor",
  VariableEditor = "VariableEditor",
  None = "None",
}
interface EditSurveyProps {
  questions: Array<Question>;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
}
export function EditSurvey({
  questions,
  addQnTrigger,
  surveyLanguages,
  setSelectedLanguage,
}: EditSurveyProps) {
  const [activeTab, setActiveTab] = useState<QuestionTabsEnum>(
    QuestionTabsEnum.None,
  );
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const { surveyId } = useContext(SurveyContext);
  const { data: survey } = useSurvey(surveyId);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

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
  return (
    <Flex
      w={"100%"}
      h={"100%"}
      mah={"100%"}
      p={5}
      gap={10}
      style={{ overflow: "auto" }}
      bg={"var(--mantine-color-body)"}
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
        />
      </PaperLayout>
      <PaperLayout className={styles["question-editor-container"]}>
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
              <MotionTransition keyValue={selectedQ}>
                <QuestionDetailedView
                  survey={survey}
                  question={selectedQ}
                  setSelectedQ={setSelectedQ}
                  setActiveTab={setActiveTab}
                  surveyLanguages={surveyLanguages}
                  setSelectedLanguage={setSelectedLanguage}
                  key={selectedQ.id}
                />
              </MotionTransition>
            )}
          </Tabs.Panel>
          <Tabs.Panel value={QuestionTabsEnum.TypeSelection}>
            <Stack>
              {survey?.type === SurveyType.Web && (
                <PageTypeSelection
                  questions={questions}
                  handleTypeSelection={handleTypeSelection}
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
        </Tabs>
      </PaperLayout>
    </Flex>
  );
}
