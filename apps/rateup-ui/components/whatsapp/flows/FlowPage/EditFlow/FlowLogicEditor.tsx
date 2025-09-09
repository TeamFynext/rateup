"use client";

// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).
import { Fragment, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
import { useTranslations } from "next-intl";
import { Updater, useImmer } from "use-immer";

import {
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";

import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "../../../../../backend/whatsapp/flow/flow.query";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import {
  LogicAction,
  LogicCondition,
  LogicConditionComponentLevel,
  QuestionType as Q,
  QuestionType,
  WaFlowFormElementType,
} from "../../../../../types/enums";
import {
  FlowLogicCondition,
  FlowLogicJump,
  FlowLogicJumpComponentLevel,
} from "../../../../../types/global";
import { logicSupportedTypes } from "../../../../../utils/data";
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
  const [componentLeventLogicJumps, updateComponentLeventLogicJumps] = useImmer<
    Array<FlowLogicJumpComponentLevel>
  >([]);

  const { selectedScreenId, flowJson, updateFlowJson, survey, map } =
    useContext(EditFlowContext);

  const screen = getScreenObjById(flowJson.screens, selectedScreenId);

  const handleAddNewJump = (componentLevel = false) => {
    {
      componentLevel
        ? updateComponentLeventLogicJumps((draft) => {
            draft.push({
              action: {
                fail: LogicAction.NextQ,
                success: LogicAction.NextQ,
              },
              conditions: [
                {
                  questionId: "",
                  condition: LogicConditionComponentLevel.EqualsTo,
                  response: undefined,
                },
              ],
            });
          })
        : updateLogicJumps((draft) => {
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
    }
  };

  const updateFlowMutation = useUpdateFlowMutation();
  const params = useParams();
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow, isLoading, isError } = useWaFlowFromDb(dbFlowId);
  const translations = useTranslations();
  useEffect(() => {
    if (
      dbFlow &&
      logicJumps.length === 0 &&
      componentLeventLogicJumps.length === 0
    ) {
      const stringActions = [];
      const objectActions = [];

      // Split the data based on action type
      (dbFlow?.logicJumps?.[selectedScreenId] || []).forEach((item) => {
        if (typeof item.action === "string") {
          stringActions.push(item);
        } else if (typeof item.action === "object") {
          objectActions.push(item);
        }
      });

      updateLogicJumps(stringActions);
      updateComponentLeventLogicJumps(objectActions);
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
      [selectedScreenId]: [...logicJumps, ...componentLeventLogicJumps],
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
        <Title order={3}>{translations("Logic Jumps for Screen:")}</Title>
        <Title c="whatsapp-green" fw={500} order={3}>
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
          {/* Todo: added again after fixing if conditon problem-now name includes hyphen
            eg: if(form.rt-5) to if(form.rt_5)
          */}
          {/* <Text>Question Jump</Text>
          {componentLeventLogicJumps.map((logicJump, index) => (
            <ConditionsActionMapBlock
              key={index}
              logic={logicJump}
              index={index}
              updateLogicJumps={updateComponentLeventLogicJumps}
              isComponentLevel
            />
          ))}
          <Button
            variant="outline"
            leftSection={<IconPlus />}
            fullWidth
            onClick={() => handleAddNewJump(true)}
            style={{
              flexShrink: 0,
            }}
          >
            Add Logic Jump
          </Button> */}
          <Text>Screen Jump</Text>
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
            onClick={() => handleAddNewJump(false)}
            style={{
              flexShrink: 0,
            }}
          >
            {translations("Add Logic Jump")}
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
            title={translations("Close ")}
            size="md"
            variant="outline"
            color="var(--tertiary-color)"
            onClick={() => afterSave()}
          />
          <RateupButtonBlue
            title={translations("Save")}
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
  isComponentLevel?: boolean;
}
function AtomicConditionBlock({
  condition,
  setCondition,
  handleDelete,
  isComponentLevel,
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
  const translations = useTranslations();
  const [selectedQId, setSelectedQId] = useState(
    condition?.questionId || editingQuestion?.id,
  );
  const selectedQ = questionsInScreen.find((q) => q.id === selectedQId);
  if (!selectedQ) return;

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
          label={translations("For Question")}
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
          data={
            isComponentLevel
              ? Object.entries(LogicConditionComponentLevel).map(
                  ([key, value]) => ({ label: key, value }),
                )
              : getConditions(selectedQ.type as QuestionType)
          }
          value={selectedCondition}
          onChange={setSelectedCondition as any}
          label="If condition"
          allowDeselect={false}
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
            placeholder={translations("Select Responses")}
            searchable
          />
        ) : isComponentLevel ? (
          <ContainedTextField
            placeholder="Enter the condition value"
            onChange={(e) => setMatchData(e.target.value)}
            value={matchData}
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
  logic: FlowLogicJump | FlowLogicJumpComponentLevel;
  updateLogicJumps: Updater<FlowLogicJump[] | FlowLogicJumpComponentLevel[]>;
  index: number;
  isComponentLevel?: boolean;
}
function ConditionsActionMapBlock({
  logic,
  updateLogicJumps,
  index,
  isComponentLevel = false,
}: ConditionsActionMapBlockProps) {
  const { selectedScreenId, flowJson, survey, map } =
    useContext(EditFlowContext);
  const currentIndex = flowJson.screens.findIndex(
    (s) => s.id === selectedScreenId,
  );
  const [selectedAction, setSelectedAction] = useState(
    logic.action || LogicAction.NextQ,
  );
  const [selectedActionSuccess, setSelectedActionSuccess] = useState(
    typeof logic.action === "object"
      ? logic.action.success
      : logic.action || LogicAction.NextQ,
  );
  const [selectedActionFail, setSelectedActionFail] = useState(
    typeof logic.action === "object"
      ? logic.action.fail
      : logic.action || LogicAction.NextQ,
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

  const elem = getQuestionsFromScreen(
    flowJson?.screens?.[currentIndex],
    survey,
    map,
  );
  const nonInputElem = flowJson?.screens?.[currentIndex]?.layout?.children
    ?.find((se) => se.type === "Form")
    ?.children?.filter((c) =>
      [
        WaFlowFormElementType.textSubHeading,
        WaFlowFormElementType.textBody,
        WaFlowFormElementType.textHeading,
        WaFlowFormElementType.textCaption,
        WaFlowFormElementType.image,
      ].includes(c.type),
    );

  const possibleActionsComponentLevel = [
    ...elem?.map((s) => {
      const label =
        s.title?.[Object.keys(s.title)[0]] ||
        s.description?.[Object.keys(s.description)[0]] ||
        s.label?.[Object.keys(s.label)[0]];
      return {
        label: `JUMP TO => ${label}`,
        value: s.id,
      };
    }),
    ...nonInputElem?.map((s) => ({
      label: `JUMP TO => ${s?.text}`,
      value: s.id,
    })),
  ];

  const { colors } = useMantineTheme();
  const translations = useTranslations();
  useEffect(() => {
    updateLogicJumps((draft) => {
      draft[index].action = isComponentLevel
        ? ({ success: selectedActionSuccess, fail: selectedActionFail } as any)
        : selectedAction;
    });
  }, [
    selectedAction,
    selectedActionSuccess,
    selectedActionFail,
    isComponentLevel,
  ]);

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
      {isComponentLevel && (
        <Box style={{ flexGrow: 1, textAlign: "center" }}>
          <Title order={4} mb="sm">
            Type
          </Title>
          <Stack
            style={{
              textAlign: "left",
            }}
          >
            <ContainedSelection
              label={"type"}
              data={["IF"]}
              defaultValue="IF"
              allowDeselect={false}
            />
          </Stack>
        </Box>
      )}
      <Box style={{ flexGrow: 1, textAlign: "center" }}>
        <Title order={4} mb="sm">
          {translations("Conditions")}
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
                isComponentLevel={isComponentLevel}
              />
              {conditionIndex !== logic.conditions.length - 1 && (
                <Text
                  style={{
                    textAlign: "center",
                  }}
                >
                  {translations("AND")}
                </Text>
              )}
            </Fragment>
          ))}
          {/* {!isComponentLevel && (
            <Button
              leftSection={<IconPlus />}
              variant={"subtle"}
              color="black"
              maw={200}
              onClick={() => {
                updateLogicJumps((draft) => {
                  if (isComponentLevel) {
                    (draft as FlowLogicJumpComponentLevel[])[
                      index
                    ].conditions.push({
                      condition: LogicConditionComponentLevel.EqualsTo,
                      response: undefined,
                      questionId: "",
                    });
                  } else {
                    (draft as FlowLogicJump[])[index].conditions.push({
                      condition: LogicCondition.Submitted,
                      response: undefined,
                      questionId: "",
                    });
                  }
                });
              }}
            >
              {translations("Add Condition")}
            </Button>
          )} */}
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
          {translations("Action")}
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
          {isComponentLevel ? (
            <Stack>
              <Select
                label="Success Action"
                data={possibleActionsComponentLevel}
                value={selectedActionSuccess}
                onChange={setSelectedActionSuccess as any}
              />
              <Select
                label="Fail Action"
                data={possibleActionsComponentLevel}
                value={selectedActionFail}
                onChange={setSelectedActionFail as any}
              />
            </Stack>
          ) : (
            <Select
              label={translations("Action")}
              data={possibleActions}
              value={selectedAction as LogicAction}
              onChange={setSelectedAction as any}
            />
          )}
        </Center>
      </Flex>
    </Flex>
  );
}
