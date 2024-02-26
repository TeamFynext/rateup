import { Flex, Tabs, Center, Text } from "@mantine/core";
import { useState, useEffect, useContext } from "react";
import GoogleReviewEditor from "../../Survey/Question/GoogleReviewEditor";
import LogicEditor from "../../Survey/Question/LogicEditor";
import { QuestionTypeSelection } from "../../Survey/Question/QuestionTypeSelection";
import ValidationRulesEditor from "../../Survey/Question/ValidationRulesEditor";
import { QuestionsSideBar } from "../../Survey/QuestionsSideBar";
import classes from "./WaEditSurvey.module.css";
import { WaQuestionDetailedView } from "./WaQuestionDetailedView";
import { QuestionType as Q, QuestionType } from "../../../types/enums";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { WaSurveyQuestionTypes } from "../../../utils/constants";
import { useQuestionCreateMutation } from "../../../backend/surveys/questions/questions.query";
import { createBlankQuestion } from "../../../utils/questions";
import SurveyContext from "../../../context/SurveyContext";

export enum QuestionTabsEnum {
  Edit = "Edit",
  TypeSelection = "TypeSelection",
  LogicEditor = "LogicEditor",
  GoogleReviewEditor = "GoogleReviewEditor",
  ValidationRulesEditor = "ValidationRulesEditor",
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
    const newQ = createBlankQuestion(type, selectedLanguage);
    const { id, ...restData } = newQ;
    const saveQ = { ...restData };
    questionCreateMutation.mutateAsync(saveQ).then((r) => {
      setSelectedQ(r.data);
      setActiveTab(QuestionTabsEnum.Edit);
    });
  };

  return (
    <Flex w={"100%"} h={"100%"} p={2} gap={10} className={classes.root}>
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
            />
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
