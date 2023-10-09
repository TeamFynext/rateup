import { Flex, Paper, Tabs, Center, Text, Title, Stack, useMantineTheme } from "@mantine/core";
import { useState, useEffect } from "react";
import GoogleReviewEditor from "../../Survey/Question/GoogleReviewEditor";
import LogicEditor from "../../Survey/Question/LogicEditor";
import { QuestionTypeSelection } from "../../Survey/Question/QuestionTypeSelection";
import ValidationRulesEditor from "../../Survey/Question/ValidationRulesEditor";
import { QuestionsSideBar } from "../../Survey/QuestionsSideBar";
import classes from "./EditWhatsappSurvey.module.css";
import whatsappStyles from '../../Promotion/RightPanel/style.module.css'
import { SendMessageMock } from "../MessageComponents";
import { useDisclosure } from "@mantine/hooks";
import { WaQuestionPreview } from "./WaQuestionPreview";
import { WaQuestionDetailedView } from "./WaQuestionDetailedView";
import { QuestionType as Q } from "../../../types/enums";


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
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false)

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
    <Flex w={"100%"} h={"100%"} p={2} gap={5}
      className={classes.root}
    >
      <Paper p={"md"} style={{ flex: 2 }} shadow="lg" radius="lg">
        <QuestionsSideBar
          questions={questions}
          selectedQ={selectedQ}
          setSelectedQ={setSelectedQ}
          setActiveTab={setActiveTab}
          addQnTrigger={addQnTrigger}
        />
      </Paper>
      <Paper
        p={"md"}
        style={{ flex: 3 }}
        shadow="lg"
        radius="lg"
      >
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
              <WaQuestionDetailedView
                question={selectedQ}
                setSelectedQ={setSelectedQ}
                setActiveTab={setActiveTab}
                surveyLanguages={surveyLanguages}
                setSelectedLanguage={setSelectedLanguage}
                key={selectedQ.id}
                setQuestionState={setSelectedQ}
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel value={QuestionTabsEnum.TypeSelection}>
            <QuestionTypeSelection
              setSelectedQ={setSelectedQ}
              setActiveTab={setActiveTab}
              types={WA_QUESTION_TYPES}
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
      <Paper
        style={{
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        shadow="lg" radius="lg"
      >
        <WhatsappChatPreviewFrame>
          {selectedQ && (
            <WaQuestionPreview question={selectedQ} />
          )
          }
        </WhatsappChatPreviewFrame>
      </Paper>
    </Flex>
  );
}

const WhatsappChatPreviewFrame = ({ children }) => {
  const theme = useMantineTheme();
  return (
    <>
      <Title
        p="sm"
        style={{
          backgroundColor: theme.colors['whatsapp-green'][9],
          textAlign: 'center',
        }}
        order={3}
        c={"white"}
      >
        Preview
      </Title>
      <Stack
        className={whatsappStyles.chatBg}
        px="xs"
        py="sm"
        justify="end"
      >
        {children}
      </Stack>
      <SendMessageMock />
    </>
  )
}
const WA_QUESTION_TYPES = [
  Q.Text,
  Q.Email,
  Q.LD,
  Q.YN,
  Q.MCQ,
  Q.Number,
  Q.Phone,
  Q.DateTime,
]