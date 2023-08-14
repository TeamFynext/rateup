// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).


import { useContext, useEffect, useState } from "react";
import {
  useQuestionUpdateMutation,
  useQuestions,
} from "../../../backend/surveys/questions/questions.query";
import { useRouter } from "next/router";
import { Center, Group, Select, Stack, Table, Button, Text, MultiSelect, useMantineTheme, ActionIcon } from "@mantine/core";
import {
  LDResponse,
  LogicAction,
  LogicCondition,
  QuestionType as Q,
  QuestionType,
  YNResponse,
} from "../../../types/enums";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionTabsEnum } from "../EditSurvey";
import { SmileyResponse } from "../../../types/enums";
import { logicSupportedTypes } from "../../../utils/data";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useListState } from "@mantine/hooks";

interface LogicEditorProps {
  selectedQ: Question;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}
const LogicEditor = ({
  selectedQ,
  setActiveTab,
}: LogicEditorProps) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: questions } = useQuestions(surveyId);
  const questionUpdateMutation = useQuestionUpdateMutation(surveyId);
  const [currentLogicJumps, handlers] = useListState<LogicJump>([]);

  useEffect(() => {
    if (selectedQ && selectedQ.logic) {
      handlers.setState(selectedQ.logic)
    } else {
      handlers.setState([])
    }
  }, [selectedQ])

  if (!selectedQ || isLoading || isError) return <></>;

  const handleAddNewJump = () => {
    handlers.append({
      condition: LogicCondition.Submitted,
      action: LogicAction.NextQ,
      response: null
    })
  }

  const handleSave = () => {
    questionUpdateMutation
      .mutateAsync({
        qId: selectedQ.id,
        data: { logic: currentLogicJumps },
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

    <Stack justify="space-between" sx={{ height: '100%' }}>
      <Stack spacing={"xs"} sx={{ overflowY: "auto", height: "100%" }}>
        {
          currentLogicJumps.map((currentLogic, index) => (
            <ConditionBlock
              key={index}
              selectedQ={selectedQ}
              questions={questions}
              currentLogicJump={currentLogic}
              setCurrentLogicJump={(newLogicJump) => handlers.setItem(index, newLogicJump)}
              handleDelete={() => handlers.remove(index)}
            />
          ))
        }
        <Button
          variant="outline"
          leftIcon={<IconPlus />}
          maw={200}
          onClick={handleAddNewJump}
        >
          Add Logic Jump
        </Button>
      </Stack>

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


function getResponses(question: Question, selectedLanguage): Array<any> {
  switch (question.type) {
    case Q.LD:
      return Object.values(LDResponse);
    case Q.MCQ:
    case Q.MSQ:
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

function getConditions(qType: QuestionType): Array<any> {
  switch (qType) {
    case Q.LD:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.MCQ:
      return [
        LogicCondition.Equals,
        LogicCondition.NotEquals,
        LogicCondition.IncludesNoneOf,
        LogicCondition.Submitted
      ];
    case Q.YN:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.Opinion:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.Rating:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.Smiley:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.MSQ:
      return [
        LogicCondition.Equals,
        LogicCondition.NotEquals,
        LogicCondition.IncludesNoneOf,
        LogicCondition.IncludesAnyOf,
        LogicCondition.IncludesAllOf,
        LogicCondition.Submitted
      ]
    default:
      throw new Error("Logic not implemented for this question type");
  }
}

// create props for below component
interface ConditionBlockProps {
  selectedQ: Question;
  questions: Array<Question>;
  currentLogicJump: LogicJump;
  setCurrentLogicJump: (newLogicJump: LogicJump) => void;
  handleDelete: () => void;
}
function ConditionBlock({ selectedQ, questions, currentLogicJump, setCurrentLogicJump, handleDelete }: ConditionBlockProps) {
  // Renders a single logic condition block of the form below
  // If answer {CONDITION SELECTOR} {DATA SELECTTOR} then {ACTION SELECTOR}

  const { colors } = useMantineTheme()
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const currentIndex = questions.findIndex((q) => q.id === selectedQ.id);
  // Only allow jumping to questions after the current one
  const possibleQuestions = questions.slice(currentIndex + 1);
  const possibleActions = [
    { label: "Next Question", value: LogicAction.NextQ },
    { label: "End Survey", value: LogicAction.EndSurvey },
    ...possibleQuestions.map((q) => ({
      label: 'JUMP TO => ' + q.title[selectedLanguage],
      value: q.id,
    })),
  ];

  const [selectedCondition, setSelectedCondition] = useState(currentLogicJump.condition);
  const [selectedAction, setSelectedAction] = useState(currentLogicJump.action);
  const [matchData, setMatchData] = useState(currentLogicJump.response);

  useEffect(() => {
    setCurrentLogicJump({
      condition: selectedCondition,
      action: selectedAction,
      response: matchData
    })
  }, [selectedCondition, selectedAction, matchData])
  return (
    <Group spacing="xs" sx={{ backgroundColor: colors.blue[0], borderRadius: "12px", position: "relative" }} p={"xs"} >
      <Text>
        If answer
      </Text>
      {/* Condition Selector */}
      <Select
        data={getConditions(selectedQ.type)}
        value={selectedCondition}
        onChange={setSelectedCondition as any}
        maw={175}
        label="Condition"
      />

      {/* Match Data */}
      {
        selectedCondition === LogicCondition.Submitted ? (<></>) : (
          [LogicCondition.IncludesAllOf, LogicCondition.IncludesAnyOf, LogicCondition.IncludesNoneOf].includes(selectedCondition)
          ||
          (selectedQ.type === Q.MSQ && selectedCondition === LogicCondition.Equals)
           ? (
            // Array Selector
            <MultiSelect
              label={"Match Data"}
              data={getResponses(selectedQ, selectedLanguage)}
              value={Array.isArray(matchData) ? matchData : []}
              onChange={setMatchData}
              placeholder="Select Responses"
              searchable
            />
          ) : (
            <Select
              label="Match Data"
              value={Array.isArray(matchData) ? "" : matchData}
              data={getResponses(selectedQ, selectedLanguage)}
              onChange={setMatchData}
            />
          )
        )
      }
      <Text>
        then
      </Text>

      {/* Action Selector */}
      <Select
        label="Action"
        data={possibleActions}
        value={selectedAction}
        onChange={setSelectedAction as any}
      />
      <ActionIcon
        sx={{ position: "absolute", right: "12px" }}
        onClick={handleDelete}
      >
        <IconTrash color={colors.red[5]} />
      </ActionIcon>
    </Group>
  );
}

export default LogicEditor;
// TODO: add checks for conflicts in logicJumps?
//       for example if there exists multiple conditions which matches a single response & has different actions,
//       then the logic is ambiguous and should not be allowed