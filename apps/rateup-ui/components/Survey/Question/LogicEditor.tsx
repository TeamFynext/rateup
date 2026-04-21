"use client";

// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).
import { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  ActionIcon,
  Button,
  Center,
  Flex,
  Group,
  MultiSelect,
  ScrollAreaAutosize,
  Select,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useQuestions,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  LogicAction,
  LogicCondition,
  QuestionType as Q,
  QuestionType,
} from "../../../types/enums";
import { getContent } from "../../../utils";
import { logicSupportedTypes } from "../../../utils/data";
import {
  getConditions,
  getResponses,
} from "../../../utils/survey/logic/logic.utils";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { QuestionTabsEnum } from "../EditSurvey";

interface LogicEditorProps {
  selectedQ: Question;
  setActiveTab: React.Dispatch<React.SetStateAction<QuestionTabsEnum>>;
}
const LogicEditor = ({ selectedQ, setActiveTab }: LogicEditorProps) => {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const { isLoading, isError, data: questions } = useQuestions(surveyId);
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });
  const [currentLogicJumps, handlers] = useListState<LogicJump>([]);
  const translations = useExtracted();
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
    toast.loading(translations("Hold on, your changes are getting updated.."), {
      id: "load-data",
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

  if (!logicSupportedTypes.includes(selectedQ.type as QuestionType)) {
    return (
      <Center style={{ height: "100%" }}>
        <Stack>
          <p>{translations("Logic is not supported for this question type")}</p>
          <RateupButtonSecondary
            title={translations("Go Back")}
            size="sm"
            onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
          />
        </Stack>
      </Center>
    );
  }

  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <ScrollAreaAutosize mah={"80dvh"}>
        <Stack gap={"xs"} mr={"sm"}>
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
            mb={4}
          >
            {translations("Add Logic Jump")}
          </Button>
        </Stack>
      </ScrollAreaAutosize>
      <Group justify="space-between">
        <RateupButtonSecondary
          title={translations("Cancel")}
          size="md"
          variant="outline"
          color="var(--tertiary-color)"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
        <RateupButtonBlue
          title={translations("Save")}
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
        getContent(q.title[selectedLanguage]) || q.description[selectedLanguage]
      }`, // TODO: truncate
      value: q.id,
    })),
  ];

  const [selectedCondition, setSelectedCondition] = useState(
    currentLogicJump.condition,
  );
  const [selectedAction, setSelectedAction] = useState(currentLogicJump.action);
  const [matchData, setMatchData] = useState(currentLogicJump.response);
  const translations = useExtracted();
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
    <Flex>
      <Group
        style={{
          backgroundColor: `light-dark(${colors.blue[0]},var(--mantine-color-dark-7))`,
          borderRadius: "12px",
          position: "relative",
          flex: 1,
        }}
        p="md"
      >
        <Text style={{ marginLeft: "10px" }}>If answer</Text>
        {/* Condition Selector */}
        <Select
          data={getConditions(selectedQ.type as QuestionType)}
          value={selectedCondition}
          onChange={setSelectedCondition as any}
          maw={150}
          label={translations("Condition")}
          mb={"md"}
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
            label={translations("Match Data")}
            data={getResponses(selectedQ, selectedLanguage)}
            value={Array.isArray(matchData) ? matchData : []}
            onChange={setMatchData}
            placeholder={translations("Select Responses")}
            searchable
            w={155}
            mb={"md"}
          />
        ) : (
          <Select
            label={translations("Match Data")}
            value={Array.isArray(matchData) ? "" : matchData}
            data={getResponses(selectedQ, selectedLanguage)}
            onChange={(value) => setMatchData(value)}
            w={165}
            mb={"md"}
          />
        )}
        <Text>then</Text>

        {/* Action Selector */}
        <Select
          label={translations("Action")}
          data={possibleActions}
          value={selectedAction}
          onChange={(value) => setSelectedAction(value as any)}
          style={{
            flex: 1,
          }}
          mb={"md"}
        />
        <ActionIcon
          style={{ marginLeft: "10px", marginRight: "1rem" }}
          onClick={handleDelete}
          variant="outline"
          color="red"
        >
          <IconTrash />
        </ActionIcon>
      </Group>
    </Flex>
  );
}

export default LogicEditor;
// TODO: add checks for conflicts in logicJumps?
//       for example if there exists multiple conditions which matches a single response & has different actions,
//       then the logic is ambiguous and should not be allowed
