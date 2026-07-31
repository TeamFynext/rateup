import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).
import { Fragment, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Updater } from "use-immer";
import { useImmer } from "use-immer";

import { useUpdateFlowMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/types/enums.ts";
import {
  LogicAction,
  LogicCondition,
  LogicConditionComponentLevel,
  QuestionType as Q,
  WaFlowFormElementType,
} from "@/types/enums.ts";
import type {
  FlowLogicCondition,
  FlowLogicJump,
  FlowLogicJumpComponentLevel,
} from "@/types/global";
import { logicSupportedTypes } from "@/utils/data.ts";
import { getConditions, getResponses } from "@/utils/survey/logic/logic.utils";
import { getQuestionLabel } from "@/utils/survey/question/question.utils";
import {
  getQuestionFromFlowElementId,
  getQuestionsFromScreen,
  getScreenObjById,
} from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext.ts";

interface SelectOption {
  label: string;
  value: string;
}

/** Normalises the `string[] | {label,value}[]` shapes the logic utils return. */
const toOptions = (data: unknown[]): SelectOption[] =>
  (data ?? []).map((d) => (typeof d === "string" ? { label: d, value: d } : d));

/** Labelled shadcn Select used throughout the logic editor. */
function SelectField({
  label,
  data,
  value,
  onChange,
  placeholder,
  className,
}: Readonly<{
  label?: string;
  data: unknown[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}>) {
  const options = toOptions(data);
  return (
    <Field className={cn("flex flex-col gap-1", className)}>
      {label && <FieldTitle>{label}</FieldTitle>}
      <Select value={value ?? ""} onValueChange={(value) => onChange(value ?? "")} items={options}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

interface LogicEditorProps {
  afterSave: () => void;
}

export const FlowLogicEditor = ({ afterSave }: LogicEditorProps) => {
  const [logicJumps, updateLogicJumps] = useImmer<Array<FlowLogicJump>>([]);
  const [componentLeventLogicJumps, updateComponentLeventLogicJumps] = useImmer<
    Array<FlowLogicJumpComponentLevel>
  >([]);

  const { selectedScreenId, flowJson } = useContext(EditFlowContext);

  const screen = getScreenObjById(flowJson.screens, selectedScreenId);

  const handleAddNewJump = (componentLevel = false) => {
    {
      if (componentLevel) {
        updateComponentLeventLogicJumps((draft) => {
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
        });
      } else {
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
      }
    }
  };

  const updateFlowMutation = useUpdateFlowMutation();
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow, isLoading, isError } = useWaFlowFromDb(dbFlowId);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (dbFlow && logicJumps.length === 0 && componentLeventLogicJumps.length === 0) {
      const stringActions: FlowLogicJump[] = [];
      const objectActions: FlowLogicJumpComponentLevel[] = [];

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
      ...(Object.fromEntries(
        Object.entries(dbFlow?.logicJumps ?? {}).filter(([k, _v]) => {
          return k !== selectedScreenId;
        }),
      ) || {}),
      [selectedScreenId]: [...logicJumps, ...componentLeventLogicJumps],
    };

    updateFlowMutation.mutate({
      dbFlowId,
      data: {
        logicJumps: Object.fromEntries(
          Object.entries(updatedLogicJumps).filter(([, v]) => (v as unknown[]).length > 0),
        ),
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{translations("Logic Jumps for Screen:")}</h3>
        <h3 className="text-lg font-medium text-(--whatsapp-green)">{screen?.title}</h3>
      </div>
      <ScrollArea className="grow">
        <div className="my-2 flex flex-1 flex-col gap-2 rounded-xl py-2">
          <p>Screen Jump</p>
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
            className="w-full shrink-0"
            onClick={() => handleAddNewJump(false)}
          >
            <IconPlus />
            {translations("Add Logic Jump")}
          </Button>
        </div>
      </ScrollArea>
      <div className="flex flex-col">
        <div className="flex grow items-center justify-between">
          <Button variant="outline" size="lg" onClick={() => afterSave()}>
            {translations("Close ")}
          </Button>
          <Button size="lg" onClick={handleSave} disabled={updateFlowMutation.isPending}>
            {updateFlowMutation.isPending && <Spinner />}
            {translations("Save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Conditions whose match data is a list rather than a single value. */
const MULTI_VALUE_CONDITIONS: Array<LogicCondition | LogicConditionComponentLevel> = [
  LogicCondition.IncludesAllOf,
  LogicCondition.IncludesAnyOf,
  LogicCondition.IncludesNoneOf,
];

// create props for below component
interface AtomicConditionBlockProps {
  condition: FlowLogicCondition | FlowLogicJumpComponentLevel["conditions"][number];
  setCondition: (
    condition: FlowLogicCondition | FlowLogicJumpComponentLevel["conditions"][number],
  ) => void;
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

  const [selectedCondition, setSelectedCondition] = useState(condition.condition);
  const selectedScreen = getScreenObjById(flowJson.screens, selectedScreenId);
  const questionsInScreen = getQuestionsFromScreen(selectedScreen!, survey, map);
  const logicSupportedQuestionsInScreen = questionsInScreen?.filter((q) =>
    logicSupportedTypes.includes(q.type as QuestionType),
  );
  const { t: translations } = useTranslation();
  const [selectedQId, setSelectedQId] = useState(condition?.questionId || editingQuestion?.id);
  const selectedQ = questionsInScreen?.find((q) => q.id === selectedQId);
  if (!selectedQ) return;

  const [matchData, setMatchData] = useState(condition.response);

  useEffect(() => {
    setCondition({
      condition: selectedCondition,
      response: matchData,
      questionId: selectedQId ?? "",
    });
  }, [selectedCondition, matchData, selectedQId]);
  // TODO: remove these states & update the condition directly in the parent component

  return (
    <div className="relative flex min-w-75 items-center gap-2 rounded-xl bg-background p-2">
      <div className="flex flex-col gap-0.5">
        <SelectField
          label={translations("For Question")}
          data={(logicSupportedQuestionsInScreen ?? []).map((q) => ({
            label: getQuestionLabel(q, selectedLanguage), // TODO: show index too
            value: q.id,
          }))}
          value={selectedQId}
          onChange={(value) => setSelectedQId(value)}
          className="shrink-0"
        />
        {/* Condition Selector */}
        <SelectField
          label="If condition"
          data={
            isComponentLevel
              ? Object.entries(LogicConditionComponentLevel).map(([key, value]) => ({
                  label: key,
                  value,
                }))
              : getConditions(selectedQ.type as QuestionType)
          }
          value={selectedCondition}
          onChange={setSelectedCondition}
        />

        {/* Match Data */}
        {selectedCondition === LogicCondition.Submitted ? (
          <></>
        ) : (selectedCondition && MULTI_VALUE_CONDITIONS.includes(selectedCondition)) ||
          ((selectedQ.type === Q.MSQ || selectedQ.type === Q.DDMS) &&
            selectedCondition === LogicCondition.Equals) ? (
          // Array Selector
          <MultiSelect
            options={toOptions(getResponses(selectedQ, selectedLanguage))}
            value={Array.isArray(matchData) ? matchData : []}
            onValueChange={setMatchData}
            placeholder={translations("Select Responses")}
          />
        ) : isComponentLevel ? (
          <Input
            placeholder="Enter the condition value"
            onChange={(e) => setMatchData(e.target.value)}
            value={matchData}
          />
        ) : (
          <SelectField
            value={Array.isArray(matchData) ? "" : matchData}
            data={getResponses(selectedQ, selectedLanguage)}
            onChange={setMatchData}
          />
        )}
      </div>
      <Button variant="outline" size="icon-sm" className="absolute right-3" onClick={handleDelete}>
        <IconTrash />
      </Button>
    </div>
  );
}

interface ConditionsActionMapBlockProps<T extends FlowLogicJump | FlowLogicJumpComponentLevel> {
  logic: T;
  updateLogicJumps: Updater<T[]>;
  index: number;
  isComponentLevel?: boolean;
}
function ConditionsActionMapBlock<T extends FlowLogicJump | FlowLogicJumpComponentLevel>({
  logic,
  updateLogicJumps,
  index,
  isComponentLevel = false,
}: ConditionsActionMapBlockProps<T>) {
  const { selectedScreenId, flowJson, survey, map } = useContext(EditFlowContext);
  const currentIndex = flowJson.screens.findIndex((s) => s.id === selectedScreenId);
  const [selectedAction, setSelectedAction] = useState(logic.action || LogicAction.NextQ);
  const [selectedActionSuccess, setSelectedActionSuccess] = useState(
    typeof logic.action === "object" ? logic.action.success : logic.action || LogicAction.NextQ,
  );
  const [selectedActionFail, setSelectedActionFail] = useState(
    typeof logic.action === "object" ? logic.action.fail : logic.action || LogicAction.NextQ,
  );
  // Only allow jumping to screens after the current one
  const nextScreens = flowJson.screens.slice(currentIndex + 1);
  const possibleActions = [
    { label: "Next Screen (default)", value: LogicAction.NextQ },
    // { label: "End Survey", value: LogicAction.EndSurvey }, // TODO: implement
    ...nextScreens.map((s) => ({
      label: `JUMP TO => ${s.title}`, // TODO: truncate
      value: s.id,
    })),
  ];

  const elem = getQuestionsFromScreen(flowJson?.screens?.[currentIndex], survey, map);
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
    ...(elem?.map((s) => {
      const label =
        s.title?.[Object.keys(s.title)[0]] ||
        s.description?.[Object.keys(s.description)[0]] ||
        s.label?.[Object.keys(s.label)[0]];
      return {
        label: `JUMP TO => ${label}`,
        value: s.id,
      };
    }) ?? []),
    ...(nonInputElem?.map((s) => ({
      label: `JUMP TO => ${s?.text}`,
      value: s.id,
    })) ?? []),
  ];

  const { t: translations } = useTranslation();
  useEffect(() => {
    updateLogicJumps((draft) => {
      draft[index].action = isComponentLevel
        ? { success: selectedActionSuccess, fail: selectedActionFail }
        : selectedAction;
    });
  }, [selectedAction, selectedActionSuccess, selectedActionFail, isComponentLevel]);

  return (
    <div className="relative flex min-w-fit items-stretch gap-2 rounded-[inherit] bg-green-50 p-2 dark:bg-green-950/40">
      {isComponentLevel && (
        <div className="grow text-center">
          <h4 className="mb-2 text-base font-semibold">Type</h4>
          <div className="flex flex-col gap-3 text-left">
            <SelectField label="type" data={["IF"]} value="IF" onChange={() => {}} />
          </div>
        </div>
      )}
      <div className="grow text-center">
        <h4 className="mb-2 text-base font-semibold">{translations("Conditions")}</h4>
        <div className="flex flex-col gap-3 text-left">
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
                <p className="text-center">{translations("AND")}</p>
              )}
            </Fragment>
          ))}
        </div>
      </div>
      {/* Action Selector */}
      <div className="flex min-w-62.5 flex-col">
        <h4 className="text-center text-base font-semibold">{translations("Action")}</h4>
        <div className="my-3 mb-13 flex grow items-center justify-center rounded-xl bg-background px-3">
          {isComponentLevel ? (
            <div className="flex flex-col gap-3">
              <SelectField
                label="Success Action"
                data={possibleActionsComponentLevel}
                value={selectedActionSuccess}
                onChange={setSelectedActionSuccess}
              />
              <SelectField
                label="Fail Action"
                data={possibleActionsComponentLevel}
                value={selectedActionFail}
                onChange={setSelectedActionFail}
              />
            </div>
          ) : (
            <SelectField
              label={translations("Action")}
              data={possibleActions}
              value={selectedAction as LogicAction}
              onChange={setSelectedAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}
