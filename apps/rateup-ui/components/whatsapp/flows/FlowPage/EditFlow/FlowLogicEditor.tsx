// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).

import { Fragment, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Box,
  Button,
  Center,
  Flex,
  Group,
  MultiSelect,
  ScrollAreaAutosize,
  Select,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Updater, useImmer } from "use-immer";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "../../../../../backend/whatsapp/flow/flow.query";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import {
  LogicAction,
  LogicCondition,
  QuestionType as Q,
  QuestionType,
} from "../../../../../types/enums";
import { FlowLogicCondition, FlowLogicJump } from "../../../../../types/global";
import { logicSupportedTypes } from "../../../../../utils/data";
import { lexend500 } from "../../../../../utils/fonts";
import {
  getConditions,
  getResponses,
} from "../../../../../utils/survey/logic/logic.utils";
import { getQuestionLabel } from "../../../../../utils/survey/question/question.utils";
import {
  getQuestionFromFlowElementId,
  getQuestionsFromScreen,
  getScreenObjById,
} from "../../../../../utils/whatsapp/flow.utils";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../Button/RateupButtons";
import { EditFlowContext } from "./EditFlowContext";

interface LogicEditorProps {
  afterSave: () => void;
}

export const FlowLogicEditor = ({ afterSave }: LogicEditorProps) => {
  const [logicJumps, updateLogicJumps] = useImmer<Array<FlowLogicJump>>([]);

  const { selectedScreenId, flowJson } = useContext(EditFlowContext);

  const screen = getScreenObjById(flowJson.screens, selectedScreenId);

  const handleAddNewJump = () => {
    updateLogicJumps((draft) => {
      draft.push({
        action: LogicAction.NextQ,
        conditions: [
          {
            questionId: "",
            condition: LogicCondition.Submitted,
            response: undefined,
          },
        ],
      });
    });
  };

  const updateFlowMutation = useUpdateFlowMutation();
  const dbFlowId = useRouter().query.dbFlowId as string;
  const { data: dbFlow, isLoading, isError } = useWaFlowFromDb(dbFlowId);
  const { translations } = useTranslations();
  useEffect(() => {
    if (dbFlow && logicJumps.length === 0) {
      updateLogicJumps((draft) => {
        return dbFlow.logicJumps?.[selectedScreenId] || [];
      });
    }
  }, [dbFlow]);

  if (isLoading || isError) return null;

  const handleSave = () => {
    const updatedLogicJumps = {
      ...((Object.fromEntries(
        Object.entries(dbFlow.logicJumps).filter(([k, _v]) => {
          return k !== selectedScreenId;
        }),
      ) || {}) as any),
      [selectedScreenId]: logicJumps,
    };

    updateFlowMutation.mutate({
      dbFlowId,
      data: {
        logicJumps: Object.fromEntries(
          Object.entries(updatedLogicJumps).filter(
            ([_, v]: [string, any[]]) => v.length > 0,
          ),
        ) as any,
      },
    });
  };

  return (
    <Flex style={{ flexDirection: "column", height: "100%" }}>
      <Group gap={"xs"}>
        <Title order={3}>{translations["Logic Jumps for Screen:"]}</Title>
        <Title c="whatsapp-green" className={lexend500.className} order={3}>
          {screen.title}
        </Title>{" "}
        {/* TODO: fix native font weight not working */}
      </Group>
      <ScrollAreaAutosize
        style={{
          flexGrow: 1,
        }}
      >
        <Stack
          gap={"xs"}
          style={{
            flex: 1,
            borderRadius: "12px",
          }}
          my="xs"
          py="xs"
        >
          {logicJumps.map((logicJump, index) => (
            <ConditionsActionMapBlock
              key={index}
              logic={logicJump}
              index={index}
              updateLogicJumps={updateLogicJumps}
            />
          ))}
          <Button
            variant="outline"
            leftSection={<IconPlus />}
            fullWidth
            onClick={handleAddNewJump}
            style={{
              flexShrink: 0,
            }}
          >
            {translations["Add Logic Jump"]}
          </Button>
        </Stack>
      </ScrollAreaAutosize>

      <Stack>
        <Group
          justify="space-between"
          style={{
            flexGrow: 1,
          }}
        >
          <RateupButtonSecondary
            title={translations["Close"]}
            size="md"
            variant="outline"
            color="var(--tertiary-color)"
            onClick={() => afterSave()}
          />
          <RateupButtonBlue
            title={translations["Save"]}
            size="md"
            onClick={handleSave}
            loading={updateFlowMutation.isPending}
          />
        </Group>
      </Stack>
    </Flex>
  );
};

// create props for below component
interface AtomicConditionBlockProps {
  condition: FlowLogicCondition;
  setCondition: (condition: FlowLogicCondition) => void;
  handleDelete: () => void;
}
function AtomicConditionBlock({
  condition,
  setCondition,
  handleDelete,
}: AtomicConditionBlockProps) {
  // Renders a single logic condition block of the form below
  // If answer {CONDITION SELECTOR} {DATA SELECTTOR} then {ACTION SELECTOR}

  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const { survey, selectedScreenId, flowJson, map, selectedFormElementId } =
    useContext(EditFlowContext);

  const editingQuestion = getQuestionFromFlowElementId(
    selectedFormElementId,
    flowJson,
    survey.questions,
    map,
  );

  const [selectedCondition, setSelectedCondition] = useState(
    condition.condition,
  );
  const selectedScreen = getScreenObjById(flowJson.screens, selectedScreenId);
  const questionsInScreen = getQuestionsFromScreen(selectedScreen, survey, map);
  const logicSupportedQuestionsInScreen = questionsInScreen.filter((q) =>
    logicSupportedTypes.includes(q.type as QuestionType),
  );
  const { translations } = useTranslations();
  const [selectedQId, setSelectedQId] = useState(
    condition?.questionId || editingQuestion?.id,
  );
  const selectedQ = questionsInScreen.find((q) => q.id === selectedQId);
  if (!selectedQ)
    throw new Error(translations["Selected question not found in screen"]);

  const [matchData, setMatchData] = useState(condition.response);

  useEffect(() => {
    setCondition({
      condition: selectedCondition,
      response: matchData,
      questionId: selectedQId,
    });
  }, [selectedCondition, matchData, selectedQId]);
  // TODO: remove these states & update the condition directly in the parent component

  return (
    <Group
      gap="xs"
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        position: "relative",
      }}
      miw={"300px"}
      p={"xs"}
    >
      <Stack gap={"2px"}>
        <Select
          label={translations["For Question"]}
          data={logicSupportedQuestionsInScreen.map((q) => ({
            label: getQuestionLabel(q, selectedLanguage), //TODO: show index too
            value: q.id,
          }))}
          value={selectedQId}
          onChange={setSelectedQId}
          style={{
            flexShrink: 0,
          }}
        />
        {/* Condition Selector */}
        <Select
          data={getConditions(selectedQ.type as QuestionType)}
          value={selectedCondition}
          onChange={setSelectedCondition as any}
          label="If answer"
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
            data={getResponses(selectedQ, selectedLanguage)}
            value={Array.isArray(matchData) ? matchData : []}
            onChange={setMatchData}
            placeholder={translations["Select Responses"]}
            searchable
          />
        ) : (
          <Select
            value={Array.isArray(matchData) ? "" : matchData}
            data={getResponses(selectedQ, selectedLanguage)}
            onChange={setMatchData}
          />
        )}
      </Stack>
      <ActionIcon
        style={{ position: "absolute", right: "12px" }}
        onClick={handleDelete}
        variant="outline"
      >
        <IconTrash />
      </ActionIcon>
    </Group>
  );
}

interface ConditionsActionMapBlockProps {
  logic: FlowLogicJump;
  updateLogicJumps: Updater<FlowLogicJump[]>;
  index: number;
}
function ConditionsActionMapBlock({
  logic,
  updateLogicJumps,
  index,
}: ConditionsActionMapBlockProps) {
  const { selectedScreenId, flowJson } = useContext(EditFlowContext);
  const currentIndex = flowJson.screens.findIndex(
    (s) => s.id === selectedScreenId,
  );
  const [selectedAction, setSelectedAction] = useState(
    logic.action || LogicAction.NextQ,
  );
  // Only allow jumping to screens after the current one
  const nextScreens = flowJson.screens.slice(currentIndex + 1);
  const possibleActions = [
    { label: "Next Screen (default)", value: LogicAction.NextQ },
    //{ label: "End Survey", value: LogicAction.EndSurvey }, // TODO: implement
    ...nextScreens.map((s) => ({
      label: `JUMP TO => ${s.title}`, // TODO: truncate
      value: s.id,
    })),
  ];
  const { colors } = useMantineTheme();
  const { translations } = useTranslations();
  useEffect(() => {
    updateLogicJumps((draft) => {
      draft[index].action = selectedAction;
    });
  }, [selectedAction]);

  return (
    <Flex
      gap="xs"
      style={{
        backgroundColor: colors["green"][0],
        borderRadius: "inherit",
        position: "relative",
        minWidth: "fit-content",
      }}
      p={"xs"}
      align={"stretch"}
    >
      <Box style={{ flexGrow: 1, textAlign: "center" }}>
        <Title order={4} mb="sm">
          {translations["Conditions"]}
        </Title>
        <Stack
          style={{
            textAlign: "left",
          }}
        >
          {logic.conditions.map((condition, conditionIndex) => (
            <Fragment key={conditionIndex}>
              <AtomicConditionBlock
                key={conditionIndex}
                condition={condition}
                setCondition={(newCondition) => {
                  updateLogicJumps((draft) => {
                    draft[index].conditions[conditionIndex] = newCondition;
                  });
                }}
                handleDelete={() => {
                  if (logic.conditions.length === 1) {
                    updateLogicJumps((draft) => {
                      draft.splice(index, 1);
                    });
                  } else {
                    updateLogicJumps((draft) => {
                      draft[index].conditions.splice(conditionIndex, 1);
                    });
                  }
                }}
              />
              {conditionIndex !== logic.conditions.length - 1 && (
                <Text
                  style={{
                    textAlign: "center",
                  }}
                >
                  {translations["AND"]}
                </Text>
              )}
            </Fragment>
          ))}
          <Button
            leftSection={<IconPlus />}
            variant={"subtle"}
            color="black"
            maw={200}
            onClick={() => {
              updateLogicJumps((draft) => {
                draft[index].conditions.push({
                  condition: LogicCondition.Submitted,
                  response: undefined,
                  questionId: "",
                });
              });
            }}
          >
            {translations["Add Condition"]}
          </Button>
        </Stack>
      </Box>

      {/* Action Selector */}
      <Flex direction={"column"} miw={"250px"}>
        <Title
          order={4}
          style={{
            textAlign: "center",
          }}
        >
          {translations["Action"]}
        </Title>
        <Center
          style={{
            flexGrow: 1,
            borderRadius: "12px",
          }}
          my="sm"
          px="sm"
          mb="52px"
          bg="white"
        >
          <Select
            label={translations["Action"]}
            data={possibleActions}
            value={selectedAction}
            onChange={setSelectedAction as any}
          />
        </Center>
      </Flex>
    </Flex>
  );
}
