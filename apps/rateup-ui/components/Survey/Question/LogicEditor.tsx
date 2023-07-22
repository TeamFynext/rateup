import { useContext } from "react";
import {
  useQuestionUpdateMutation,
  useQuestions,
} from "../../../backend/surveys/questions/questions.query";
import { useRouter } from "next/router";
import { ScrollArea, Center, Group, Select, Stack, Table } from "@mantine/core";
import {
  LDResponse,
  LogicAction,
  QuestionType as Q,
  YNResponse,
} from "../../../types/enums";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionTabsEnum } from "../EditSurvey";
import { SmileyResponse } from "../../../types/enums";
import { logicSupportedTypes } from "../../../utils/data";
import { RateupButtonSecondary } from "../../Button/RateupButtons";

interface LogicEditorProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}
const LogicEditor = ({
  selectedQ,
  setSelectedQ,
  setActiveTab,
}: LogicEditorProps) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: questions } = useQuestions(surveyId);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionUpdateMutation = useQuestionUpdateMutation(surveyId);

  if (!selectedQ || isLoading || isError) return <></>;

  const currentIndex = questions.findIndex((q) => q.id === selectedQ.id);
  const possibleQuestions = questions.slice(currentIndex + 1);
  const possibleActions = [
    { label: "Next Question", value: LogicAction.NextQ },
    { label: "End Survey", value: LogicAction.EndSurvey },
    ...possibleQuestions.map((q) => ({
      label: q.title[selectedLanguage],
      value: q.id,
    })),
  ];

  const updateLogic = (logic: any) => {
    setSelectedQ({ ...selectedQ, logic });
  };

  const handleSave = () => {
    questionUpdateMutation
      .mutateAsync({
        qId: selectedQ.id,
        data: { logic: selectedQ.logic },
      })
      .then(() => {
        setActiveTab(QuestionTabsEnum.Edit);
      });
  };

  if (!logicSupportedTypes.includes(selectedQ.type)) {
    return (
      <Center sx={{ height: "100%" }}>
        <Stack>
          <p>Logic is not supported for this question type</p>
          <RateupButtonSecondary 
            title={"Go Back"}
            size="sm"
            onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
          />

        </Stack>
      </Center>
    );
  }

  const stickyHeaderStyles: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'white',
    marginBottom: '50px'
  };
  return (

    <Stack justify="space-between" sx={{height:'100%'}}>
      <ScrollArea sx={{height:'90%', overscrollBehavior: 'contain'}}>
        <Table align="center">
          <thead style={stickyHeaderStyles}>
            <tr>
              <th>Response</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
                {getResponses(selectedQ, selectedLanguage).map((response) => (
                  <ActionSelector
                    key={response}
                    possibleActions={possibleActions}
                    response={response}
                    currentLogic={selectedQ.logic}
                    updateLogic={updateLogic}
                  />
                ))}
          </tbody>
        </Table>
      </ScrollArea>
      <Group position="apart">
        <RateupButtonSecondary 
            title={"Cancel"}
            size="md"
            onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
          />
          <RateupButtonSecondary 
            title={"Save"}
            size="md"
            onClick={handleSave}
          />
      </Group>
    </Stack>
  );
};

function ActionSelector({
  possibleActions,
  response,
  currentLogic,
  updateLogic,
}) {
  const handleChange = (value: string | LogicAction) => {
    updateLogic({ ...currentLogic, [response]: value });
  };
  return (
    <tr key={response}>
      <td>{response}</td>
      <td>
        <Select
          data={possibleActions}
          value={currentLogic?.[response] || LogicAction.NextQ}
          onChange={handleChange}
        />
      </td>
    </tr>
  );
}

function getResponses(question: Question, selectedLanguage): Array<any> {
  switch (question.type) {
    case Q.LD:
      return Object.values(LDResponse);
    case Q.MCQ:
      return question.choices?.[selectedLanguage] || [];
    case Q.YN:
      return Object.values(YNResponse);
    case Q.Opinion:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    case Q.Rating:
      return [1, 2, 3, 4, 5];
    case Q.Smiley:
      return Object.values(SmileyResponse);
    default:
      throw new Error("Logic not implemented for this question type");
  }
}

export default LogicEditor;
