"use client";

import { useContext, useEffect, useState } from "react";

import { Center, Flex, Tabs, Text } from "@mantine/core";
import { useExtracted } from "next-intl";

import { useQuestionCreateMutation } from "../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import { QuestionType as Q, QuestionType } from "../../../types/enums";
import { WaSurveyQuestionTypes } from "../../../utils/constants";
import { createBlankQuestion } from "../../../utils/questions";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import GoogleReviewEditor from "../../Survey/Question/GoogleReviewEditor";
import LogicEditor from "../../Survey/Question/LogicEditor";
import { QuestionTypeSelection } from "../../Survey/Question/QuestionTypeSelection";
import ValidationRulesEditor from "../../Survey/Question/ValidationRulesEditor";
import { QuestionsSideBar } from "../../Survey/QuestionsSideBar";
import classes from "./WaEditSurvey.module.css";
import { WaQuestionDetailedView } from "./WaQuestionDetailedView";

export enum QuestionTabsEnum {
  Edit = "Edit",
  TypeSelection = "TypeSelection",
  LogicEditor = "LogicEditor",
  GoogleReviewEditor = "GoogleReviewEditor",
  ValidationRulesEditor = "ValidationRulesEditor",
  TicketIssueEditor = "TicketIssueEditor",
  None = "None",
}
interface EditSurveyProps {
  questions: Array<Question>;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
}
export function EditWhatsappSurvey({
  questions,
  addQnTrigger,
  surveyLanguages,
  setSelectedLanguage,
}: EditSurveyProps) {
  const [activeTab, setActiveTab] = useState<QuestionTabsEnum>(
    QuestionTabsEnum.None,
  );
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  useEffect(() => {
    if (!selectedQ) return;
    if (questions && selectedQ.id) {
      const Q = questions.find((q) => q.id === selectedQ.id);
      if (Q) {
        setSelectedQ(Q);
      }
    }
  }, [questions]);
  const { surveyId } = useContext(SurveyContext);

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const handleTypeSelection = (type: QuestionType) => {
    const newQ = createBlankQuestion(type, surveyLanguages);
    const { id, ...restData } = newQ;
    const saveQ = { ...restData };
    questionCreateMutation.mutateAsync(saveQ).then((r) => {
      setSelectedQ(r.data);
      setActiveTab(QuestionTabsEnum.Edit);
    });
  };
  const translations = useExtracted();
  return (
    <Flex w={"100%"} h={"100%"} p={5} gap={10} className={classes.root}>
      <PaperLayout
        style={{ flex: 2 }}
        className={classes["wa-que-sidebar-container"]}
      >
        <QuestionsSideBar
          setSelectedLanguage={setSelectedLanguage}
          surveyLanguages={surveyLanguages}
          questions={questions}
          selectedQ={selectedQ}
          setSelectedQ={setSelectedQ}
          setActiveTab={setActiveTab}
          addQnTrigger={addQnTrigger}
          isWaSurvey={true}
        />
      </PaperLayout>
      <PaperLayout p={"md"} style={{ flex: 5 }}>
        <Tabs
          pb="md"
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as QuestionTabsEnum)}
          style={{ height: "100%" }}
          classNames={{
            panel: classes.panel,
          }}
        >
          <Tabs.Panel value={QuestionTabsEnum.Edit} style={{ height: "100%" }}>
            {selectedQ && (
              <WaQuestionDetailedView
                question={selectedQ}
                setSelectedQ={setSelectedQ}
                setActiveTab={setActiveTab}
                surveyLanguages={surveyLanguages}
                setSelectedLanguage={setSelectedLanguage}
                key={selectedQ.id}
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel value={QuestionTabsEnum.TypeSelection}>
            <QuestionTypeSelection
              questionTypeGroups={WaSurveyQuestionTypes}
              handleTypeSelection={handleTypeSelection}
            />
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
          <Tabs.Panel value={QuestionTabsEnum.ValidationRulesEditor}>
            <ValidationRulesEditor
              selectedQ={selectedQ}
              setSelectedQ={setSelectedQ}
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
          </Tabs.Panel>
          <Tabs.Panel value={QuestionTabsEnum.None}>
            <Center style={{ height: "100%" }}>
              <Text c="dimmed">
                {translations("Select a question to edit")}
              </Text>
            </Center>
          </Tabs.Panel>
        </Tabs>
      </PaperLayout>
    </Flex>
  );
}
