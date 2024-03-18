// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).

import { useContext, useEffect, useState } from "react";
import {
  useQuestionUpdateMutation,
  useQuestions,
} from "../../../backend/surveys/questions/questions.query";
import { useRouter } from "next/router";
import {
  Center,
  Group,
  Select,
  Stack,
  Button,
  Text,
  MultiSelect,
  useMantineTheme,
  ActionIcon,
} from "@mantine/core";
import {
  LogicAction,
  LogicCondition,
  QuestionType as Q,
} from "../../../types/enums";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionTabsEnum } from "../EditSurvey";
import { logicSupportedTypes } from "../../../utils/data";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useListState } from "@mantine/hooks";
import {
  getConditions,
  getResponses,
} from "../../../utils/survey/logic/logic.utils";
import { notifications } from "@mantine/notifications";

interface LogicEditorProps {
  selectedQ: Question;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}
const LogicEditor = ({ selectedQ, setActiveTab }: LogicEditorProps) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: questions } = useQuestions(surveyId);
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });
  const [currentLogicJumps, handlers] = useListState<LogicJump>([]);

  useEffect(() => {
    if (selectedQ && selectedQ.logic) {
      handlers.setState(selectedQ.logic);
    } else {
      handlers.setState([]);
    }
  }, [selectedQ]);

  if (!selectedQ || isLoading || isError) return <></>;

  const handleAddNewJump = () => {
    handlers.append({
      condition: LogicCondition.Submitted,
      action: LogicAction.NextQ,
      response: null,
    });
  };

  const handleSave = () => {
    notifications.show({
      id: "load-data",
      loading: true,
      title: "updating question",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });
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
      <Center style={{ height: "100%" }}>
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

  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <Stack gap={"xs"} style={{ overflowY: "auto", height: "100%" }}>
        {currentLogicJumps.map((currentLogic, index) => (
          <ConditionBlock
            key={index}
            selectedQ={selectedQ}
            questions={questions}
            currentLogicJump={currentLogic}
            setCurrentLogicJump={(newLogicJump) =>
              handlers.setItem(index, newLogicJump)
            }
            handleDelete={() => handlers.remove(index)}
          />
        ))}
        <Button
          variant="outline"
          leftSection={<IconPlus />}
          maw={200}
          color="var(--tertiary-color)"
          onClick={handleAddNewJump}
        >
          Add Logic Jump
        </Button>
      </Stack>

      <Group justify="space-between">
        <RateupButtonSecondary
          title={"Cancel"}
          size="md"
          variant="outline"
          color="var(--tertiary-color)"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
        <RateupButtonBlue
          title={"Save"}
          size="md"
          onClick={handleSave}
          loading={questionUpdateMutation.isPending}
        />
      </Group>
    </Stack>
  );
};

interface ConditionBlockProps {
  selectedQ: Question;
  questions: Array<Question>;
  currentLogicJump: LogicJump;
  setCurrentLogicJump: (newLogicJump: LogicJump) => void;
  handleDelete: () => void;
}
function ConditionBlock({
  selectedQ,
  questions,
  currentLogicJump,
  setCurrentLogicJump,
  handleDelete,
}: ConditionBlockProps) {
  // Renders a single logic condition block of the form below
  // If answer {CONDITION SELECTOR} {DATA SELECTTOR} then {ACTION SELECTOR}

  const { colors } = useMantineTheme();
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const currentIndex = questions.findIndex((q) => q.id === selectedQ.id);
  // Only allow jumping to questions after the current one
  const possibleQuestions = questions.slice(currentIndex + 1);
  const possibleActions = [
    { label: "Next Question", value: LogicAction.NextQ },
    { label: "End Survey", value: LogicAction.EndSurvey },
    ...possibleQuestions?.map((q) => ({
      label: `JUMP TO => ${questions.findIndex((q1) => q1.id === q.id) + 1}) ${
        q.title[selectedLanguage] || q.description[selectedLanguage]
      }`, // TODO: truncate
      value: q.id,
    })),
  ];

  const [selectedCondition, setSelectedCondition] = useState(
    currentLogicJump.condition,
  );
  const [selectedAction, setSelectedAction] = useState(currentLogicJump.action);
  const [matchData, setMatchData] = useState(currentLogicJump.response);

  useEffect(() => {
    setCurrentLogicJump({
      condition: selectedCondition,
      action: selectedAction,
      response: matchData,
    });
  }, [selectedCondition, selectedAction, matchData]);

  useEffect(() => {
    setSelectedCondition(currentLogicJump.condition);
    setMatchData(currentLogicJump.response);
    setSelectedAction(currentLogicJump.action);
  }, [currentLogicJump]);
  return (
    <Group
      gap="xs"
      style={{
        backgroundColor: colors.blue[0],
        borderRadius: "12px",
        position: "relative",
      }}
      p={"xs"}
    >
      <Text>If answer</Text>
      {/* Condition Selector */}
      <Select
        data={getConditions(selectedQ.type)}
        value={selectedCondition}
        onChange={setSelectedCondition as any}
        maw={175}
        label="Condition"
      />

      {/* Match Data */}
      {selectedCondition === LogicCondition.Submitted ? (
        <></>
      ) : [
          LogicCondition.IncludesAllOf,
          LogicCondition.IncludesAnyOf,
          LogicCondition.IncludesNoneOf,
        ].includes(selectedCondition) ||
        ((selectedQ.type === Q.MSQ || selectedQ.type === Q.DDMS) &&
          selectedCondition === LogicCondition.Equals) ? (
        // Array Selector
        <MultiSelect
          label={"Match Data"}
          data={getResponses(selectedQ, selectedLanguage)}
          value={Array.isArray(matchData) ? matchData : []}
          onChange={setMatchData}
          placeholder="Select Responses"
          searchable
          w={250}
        />
      ) : (
        <Select
          label="Match Data"
          value={Array.isArray(matchData) ? "" : matchData}
          data={getResponses(selectedQ, selectedLanguage)}
          onChange={setMatchData}
          w={250}
        />
      )}
      <Text>then</Text>

      {/* Action Selector */}
      <Select
        label="Action"
        data={possibleActions}
        value={selectedAction}
        onChange={setSelectedAction as any}
      />
      <ActionIcon
        style={{ position: "absolute", right: "12px" }}
        onClick={handleDelete}
        variant="outline"
        color="red"
      >
        <IconTrash />
      </ActionIcon>
    </Group>
  );
}

export default LogicEditor;
// TODO: add checks for conflicts in logicJumps?
//       for example if there exists multiple conditions which matches a single response & has different actions,
//       then the logic is ambiguous and should not be allowed
