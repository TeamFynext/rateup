import { Fragment, useEffect, useState } from "react";
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
import { z } from "zod/v4";

import {
  LogicAction,
  LogicCondition,
  QuestionType2,
  WaQuestions,
} from "@/types/enums";
import {
  FlowLogicCondition,
  FlowLogicJump,
  FlowLogicJumpComponentLevel,
} from "@/types/global";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "@/backend/whatsapp/flow/flow.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import useTranslations from "@/dictionaries/useTranslation";
import { logicSupportedTypes2 } from "@/utils/data";
import { showErrorToast } from "@/utils/notifications";
import {
  getConditionsv2,
  getResponses2,
} from "@/utils/survey/logic/logic.utils";

import useFlowStore, { EditorType } from "../utils/store";
import { FlowLogicComponentEditor } from "./FlowComponentLogicEditor";

export const FlowLogicEditorV2 = () => {
  const [logicJumps, updateLogicJumps] = useImmer<Array<FlowLogicJump>>([]);
  const [logicJumpsComponentLevel, updateLogicJumpsComponentLevel] = useImmer(
    [],
  );

  const { getCurrentScreen, currentScreenId, setDetailActiveEditor } =
    useFlowStore();

  const screen = getCurrentScreen();

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
  const { data: dbFlow, isPending, isError } = useWaFlowFromDb(dbFlowId);
  const { translations } = useTranslations();
  useEffect(() => {
    if (dbFlow && logicJumps.length === 0) {
      const stringActions = [];
      const objectActions = [];

      // Split the data based on action type
      (dbFlow?.logicJumps?.[currentScreenId] || []).forEach((item) => {
        if (typeof item.action === "string") {
          stringActions.push(item);
        } else if (!item.action) {
          objectActions.push(item);
        }
      });

      updateLogicJumps(stringActions);
      updateLogicJumpsComponentLevel(objectActions);
    }
  }, [dbFlow]);

  if (isPending || isError) return null;

  // Define the condition schema
  const conditionSchema = z.object({
    field: z.string().min(1, "Field must not be empty"),
    logic: z.string().optional(), // logic can be empty or undefined
    value: z.union([
      z.string().min(1, "Value must not be empty"),
      z.number().min(1, "Value must not be empty"),
    ]),
    isNumber: z.boolean(),
    operator: z.string().min(1, "Operator must not be empty"),
  });

  // Define the main schema for each element
  const elementSchema = z.object({
    else: z
      .array(z.string())
      .min(1, "'else' array must contain at least one object."),
    then: z
      .array(z.string())
      .min(1, "'then' array must contain at least one object."),
    type: z.string().min(1, "Type must not be empty"),
    screenId: z.string().min(1, "ScreenId must not be empty"),
    conditions: z
      .array(conditionSchema)
      .min(1, "'conditions' array must contain at least one object."),
  });

  // Define the array schema
  const arraySchema = z.array(elementSchema);

  const handleSave = () => {
    let { success, error } = arraySchema.safeParse(logicJumpsComponentLevel);
    let message =
      "Invalid input" === error[0].message
        ? "All field must be filled"
        : error[0]?.message;
    if (!success) {
      showErrorToast(message, "error-invalid-logic-jumps");
    }

    const updatedLogicJumps = {
      ...((Object.fromEntries(
        Object.entries(dbFlow.logicJumps).filter(([k, _v]) => {
          return k !== currentScreenId;
        }),
      ) || {}) as any),
      [currentScreenId]: [...logicJumps, ...logicJumpsComponentLevel],
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
        <Title c="whatsapp-green" fw={500} order={3}>
          {screen.title}
        </Title>{" "}
      </Group>
      <ScrollAreaAutosize
        style={{
          flexGrow: 1,
        }}
      >
        <FlowLogicComponentEditor
          setBlocks={updateLogicJumpsComponentLevel}
          blocks={logicJumpsComponentLevel}
        />
        <Stack
          gap={"xs"}
          style={{
            flex: 1,
            borderRadius: "12px",
          }}
          my="xs"
          py="xs"
        >
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
            title={translations["Close "]}
            size="md"
            variant="outline"
            color="var(--tertiary-color)"
            onClick={() => setDetailActiveEditor(EditorType.ElementEditor)}
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

  const { getCurrentScreen } = useFlowStore();

  const selectedScreen = getCurrentScreen();
  const editingQuestion = selectedScreen?.layout.children?.[1];

  const [selectedCondition, setSelectedCondition] = useState(
    condition.condition,
  );
  const questionsInScreen = selectedScreen.layout.children
    .filter((child) => child.type !== QuestionType2.Footer)
    .map(({ id, label, type, metaType, "data-source": dataSource }) => ({
      id,
      label,
      type,
      metaType,
      dataSource,
    }));

  const logicSupportedQuestionsInScreen = questionsInScreen.filter((q) =>
    logicSupportedTypes2.includes(q.metaType),
  );
  const { translations } = useTranslations();
  const [selectedQId, setSelectedQId] = useState(
    condition?.questionId || editingQuestion?.id,
  );
  const selectedQ = questionsInScreen.find((q) => q.id === selectedQId);

  const [matchData, setMatchData] = useState(condition.response);

  useEffect(() => {
    setCondition({
      condition: selectedCondition,
      response: matchData,
      questionId: selectedQId,
    });
  }, [selectedCondition, matchData, selectedQId]);
  // TODO: remove these states & update the condition directly in the parent component
  if (!selectedQ || logicSupportedQuestionsInScreen?.length === 0) return;
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
            label: q.label,
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
          data={getConditionsv2(selectedQ.metaType)}
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
          (selectedQ.metaType === WaQuestions.CheckboxGroup &&
            selectedCondition === LogicCondition.Equals) ? (
          <MultiSelect
            data={getResponses2(selectedQ)}
            value={Array.isArray(matchData) ? matchData : []}
            onChange={setMatchData}
            placeholder={translations["Select Responses"]}
            searchable
          />
        ) : (
          <Select
            value={Array.isArray(matchData) ? "" : matchData}
            data={getResponses2(selectedQ)}
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
}
function ConditionsActionMapBlock({
  logic,
  updateLogicJumps,
  index,
}: ConditionsActionMapBlockProps) {
  const { screens, currentScreenId } = useFlowStore();

  const [selectedAction, setSelectedAction] = useState(
    logic.action || LogicAction.NextQ,
  );

  const currentIndex = screens.findIndex((s) => s.id === currentScreenId);
  // Only allow jumping to screens after the current one
  const nextScreens = screens.slice(currentIndex + 1);
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
            value={selectedAction as LogicAction}
            onChange={setSelectedAction as any}
            allowDeselect={false}
          />
        </Center>
      </Flex>
    </Flex>
  );
}
