import { Paper, Center, Text, Tabs, Flex } from "@mantine/core";
import { QuestionDetailedView } from "./Question/QuestionDetailedView";
import { QuestionTypeSelection } from "./Question/QuestionTypeSelection";
import { QuestionsSideBar } from "./QuestionsSideBar";
import { useEffect, useState } from "react";
import LogicEditor from "./Question/LogicEditor";
import GoogleReviewEditor from "./Question/GoogleReviewEditor";
import ValidationRulesEditor from "./Question/ValidationRulesEditor";
import classes from "./EditSurvey.module.css";

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
  surveyType?: string;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
}
export function EditSurvey({
  questions,
  addQnTrigger,
  surveyType,
  surveyLanguages,
  setSelectedLanguage,
}: EditSurveyProps) {
  const [activeTab, setActiveTab] = useState<QuestionTabsEnum>(
    QuestionTabsEnum.None,
  );
  const [selectedQ, setSelectedQ] = useState<Question>(null);

  useEffect(() => {
    if (!selectedQ) return;
    if (questions && selectedQ.id) {
      const Q = questions.find((q) => q.id === selectedQ.id);
      if (Q) {
        setSelectedQ(Q);
      }
    }
  }, [questions]);

  return (
    <Flex w={"100%"} h={"100%"} p={2} gap={5}>
      <Paper p={"xl"} style={{ flex: 2 }} shadow="lg" radius="lg">
        <QuestionsSideBar
          questions={questions}
          selectedQ={selectedQ}
          setSelectedQ={setSelectedQ}
          setActiveTab={setActiveTab}
          addQnTrigger={addQnTrigger}
        />
      </Paper>
      <Paper p={"md"} style={{ flex: 5 }} shadow="lg" radius="lg">
        <Tabs
          px={"md"}
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
              <QuestionDetailedView
                question={selectedQ}
                setSelectedQ={setSelectedQ}
                setActiveTab={setActiveTab}
                surveyType={surveyType}
                surveyLanguages={surveyLanguages}
                setSelectedLanguage={setSelectedLanguage}
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel value={QuestionTabsEnum.TypeSelection}>
            <QuestionTypeSelection
              setSelectedQ={setSelectedQ}
              setActiveTab={setActiveTab}
              surveyType={surveyType}
            />
          </Tabs.Panel>
          <Tabs.Panel value={QuestionTabsEnum.LogicEditor}>
            <LogicEditor selectedQ={selectedQ} setActiveTab={setActiveTab} />
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
      </Paper>
    </Flex>
  );
}
