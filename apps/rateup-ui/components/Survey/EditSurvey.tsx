import { Center, Text, Tabs, Flex } from "@mantine/core";
import { QuestionDetailedView } from "./Question/QuestionDetailedView";
import { QuestionTypeSelection } from "./Question/QuestionTypeSelection";
import { QuestionsSideBar } from "./QuestionsSideBar";
import { useEffect, useState } from "react";
import LogicEditor from "./Question/LogicEditor";
import GoogleReviewEditor from "./Question/GoogleReviewEditor";
import ValidationRulesEditor from "./Question/ValidationRulesEditor";
import styles from "./EditSurvey.module.css";
import PaperLayout from "../styled/Layouts/PaperLayout";

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

  return (
    <Flex w={"100%"} h={"100%"} gap={10}>
      <PaperLayout
        style={{ flex: 2 }}
        className={styles["questions-sidebar-container"]}
      >
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
      <PaperLayout
        style={{ flex: 5 }}
        className={styles["edit-question-container"]}
      >
        <Tabs
          px={"md"}
          pb="md"
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as QuestionTabsEnum)}
          style={{ height: "100%" }}
          classNames={{
            panel: styles.panel,
          }}
        >
          <Tabs.Panel value={QuestionTabsEnum.Edit} style={{ height: "100%" }}>
            {selectedQ && (
              <QuestionDetailedView
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
              setSelectedQ={setSelectedQ}
              setActiveTab={setActiveTab}
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
      </PaperLayout>
    </Flex>
  );
}
