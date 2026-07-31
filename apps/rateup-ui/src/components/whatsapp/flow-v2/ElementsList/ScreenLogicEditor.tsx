import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useId, Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Updater } from "use-immer";
import { useImmer } from "use-immer";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { LogicAction, LogicCondition, QuestionType2, WaQuestions } from "@/types/enums.ts";
import type { FlowLogicCondition, FlowLogicJump } from "@/types/global";
import type { FlowLogicJumpComponentLevel } from "@/types/global";
import { logicSupportedTypes3 } from "@/utils/data.ts";
import { toSelectOptions } from "@/utils/select-options.ts";
import { getConditionsv2, getResponses2 } from "@/utils/survey/logic/logic.utils";

import useFlowStore, { EditorType } from "../utils/store.ts";
// Component logic editor for conditional component visibility
import ComponentLogicEditor from "./ComponentLogicEditor.tsx";

export const ScreenLogicEditor = () => {
  const [logicJumps, updateLogicJumps] = useImmer<Array<FlowLogicJump>>([]);
  const [logicJumpsComponentLevel, updateLogicJumpsComponentLevel] = useImmer<
    Array<FlowLogicJumpComponentLevel>
  >([]);

  const {
    getCurrentScreen,
    currentScreenId,
    setDetailActiveEditor,
    getLogicJumps,
    updateLogicJumps: saveLogicJumps,
  } = useFlowStore();

  const screen = getCurrentScreen();
  const { t: translations } = useTranslation();

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

  useEffect(() => {
    if (currentScreenId) {
      const existingJumps = getLogicJumps(currentScreenId);

      if (existingJumps && existingJumps.length > 0) {
        const stringActions: FlowLogicJump[] = [];
        const objectActions: FlowLogicJumpComponentLevel[] = [];

        // Split the data based on action type
        existingJumps.forEach((item) => {
          if (typeof item.action === "string") {
            stringActions.push(item);
          } else if (!item.action) {
            objectActions.push(item);
          }
        });

        updateLogicJumps(stringActions);
        updateLogicJumpsComponentLevel(objectActions);
      } else {
        updateLogicJumps([]);
        updateLogicJumpsComponentLevel([]);
      }
    }
  }, [currentScreenId]);

  const handleSave = () => {
    // Validate component-level jumps if needed
    const hasInvalidComponentJumps = logicJumpsComponentLevel.some((jump) => {
      return !jump.conditions || jump.conditions.length === 0 || !jump.then || !jump.else;
    });

    if (hasInvalidComponentJumps) {
      toast.error("Please complete all component logic jump configurations", {
        id: "error-invalid-logic-jumps",
      });
      return;
    }

    // Combine both types of logic jumps
    const allJumps = [...logicJumps, ...logicJumpsComponentLevel];

    // Save to store
    saveLogicJumps(currentScreenId ?? "", allJumps);

    toast.success("Logic jumps saved successfully", {
      id: "success-logic-jumps",
    });
    setDetailActiveEditor(EditorType.ElementEditor);
  };

  if (!screen) return null;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-semibold">{translations("Logic Jumps for Screen:")}</h3>
        <h3 className="text-xl font-medium text-green-600">{screen.title}</h3>
      </div>
      <ScrollArea className="grow">
        {/* Component-Level Logic Jumps */}
        <div className="mb-12 pb-4">
          <ComponentLogicEditor
            setBlocks={updateLogicJumpsComponentLevel}
            blocks={logicJumpsComponentLevel}
          />
        </div>

        {/* Screen-Level Logic Jumps */}
        <div className="flex flex-col gap-6 flex-1">
          <div className="mb-2">
            <h4 className="text-lg font-semibold mb-2">{translations("Screen Jump")}</h4>
            <p className="text-sm text-muted-foreground">
              {translations("Navigate to different screens based on conditions")}
            </p>
          </div>

          {logicJumps.map((logicJump, index) => (
            <ConditionsActionMapBlock
              key={index}
              logic={logicJump}
              index={index}
              updateLogicJumps={updateLogicJumps}
            />
          ))}

          <Button variant="outline" className="w-full mt-4" onClick={handleAddNewJump}>
            <IconPlus size={16} className="mr-2" />
            {translations("Add Logic Jump")}
          </Button>
        </div>
      </ScrollArea>
      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setDetailActiveEditor(EditorType.ElementEditor)}>
            {translations("Close")}
          </Button>
          <Button onClick={handleSave}>{translations("Save")}</Button>
        </div>
      </div>
    </div>
  );
};

// Atomic Condition Block Component
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
  const uid = useId();
  const { getCurrentScreen } = useFlowStore();
  const { t: translations } = useTranslation();

  const selectedScreen = getCurrentScreen();
  const [selectedCondition, setSelectedCondition] = useState(condition.condition);

  const questionsInScreen =
    selectedScreen?.layout.children
      .filter((child) => child.type !== QuestionType2.Footer)
      .map(({ id, label, type, metaType, "data-source": dataSource }) => ({
        id,
        label,
        type,
        metaType,
        dataSource,
      })) || [];

  const logicSupportedQuestionsInScreen = questionsInScreen.filter((q) =>
    logicSupportedTypes3.includes(
      QuestionType2[q.metaType as keyof typeof QuestionType2] || q.type,
    ),
  );

  const [selectedQId, setSelectedQId] = useState(
    condition?.questionId || logicSupportedQuestionsInScreen?.[0]?.id,
  );
  const selectedQ = questionsInScreen.find((q) => q.id === selectedQId);
  const selectedQType = selectedQ?.metaType || selectedQ?.type;

  const [matchData, setMatchData] = useState(condition.response);

  useEffect(() => {
    setCondition({
      condition: selectedCondition,
      response: matchData,
      questionId: selectedQId ?? "",
    });
  }, [selectedCondition, matchData, selectedQId]);

  if (!selectedQ || logicSupportedQuestionsInScreen?.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg">
        <p className="text-sm text-muted-foreground">
          {translations("No questions available for logic jumps")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 bg-white rounded-lg relative p-4 min-w-[320px]">
      <div className="flex flex-col gap-2 grow">
        <Field>
          <FieldLabel htmlFor={`${uid}-field`}>{translations("For Question")}</FieldLabel>
          <Select
            value={selectedQId}
            onValueChange={(value) => setSelectedQId(value ?? "")}
            items={logicSupportedQuestionsInScreen.map((q) => ({ value: q.id, label: q.label }))}
          >
            <SelectTrigger id={`${uid}-field`} className="shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {logicSupportedQuestionsInScreen.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${uid}-field-2`}>{translations("If condition")}</FieldLabel>
          <Select
            value={selectedCondition}
            onValueChange={(val) => val && setSelectedCondition(val as LogicCondition)}
            items={getConditionsv2(selectedQType).map((opt) => ({
              value: opt,
              label: opt,
            }))}
          >
            <SelectTrigger id={`${uid}-field-2`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getConditionsv2(selectedQType).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {selectedCondition === LogicCondition.Submitted ? (
          <></>
        ) : [
            LogicCondition.IncludesAllOf,
            LogicCondition.IncludesAnyOf,
            LogicCondition.IncludesNoneOf,
          ].includes(selectedCondition) ||
          (selectedQ.metaType === WaQuestions.CheckboxGroup &&
            selectedCondition === LogicCondition.Equals) ? (
          <Field>
            <FieldLabel htmlFor={`${uid}-field-3`}>{translations("Response")}</FieldLabel>
            <MultiSelect
              id={`${uid}-field-3`}
              options={(getResponses2(selectedQ) || []).map((opt) =>
                typeof opt === "string" ? { label: opt, value: opt } : opt,
              )}
              value={Array.isArray(matchData) ? matchData : []}
              onValueChange={setMatchData}
              placeholder={translations("Select Responses")}
              emptyIndicator="No items found."
            />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor={`${uid}-field-4`}>{translations("Response")}</FieldLabel>
            <Select
              value={Array.isArray(matchData) ? "" : matchData}
              onValueChange={(value) => setMatchData(value ?? "")}
              items={toSelectOptions(getResponses2(selectedQ) ?? [])}
            >
              <SelectTrigger id={`${uid}-field-4`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toSelectOptions(getResponses2(selectedQ) ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 text-destructive"
        onClick={handleDelete}
      >
        <IconTrash size={16} />
      </Button>
    </div>
  );
}

// Conditions and Action Block
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
  const uid = useId();
  const { screens, currentScreenId } = useFlowStore();
  const { t: translations } = useTranslation();

  const [selectedAction, setSelectedAction] = useState(logic.action || LogicAction.NextQ);

  const currentIndex = screens.findIndex((s) => s.id === currentScreenId);
  const nextScreens = screens.slice(currentIndex + 1);

  const possibleActions = [
    { label: translations("Next Screen (default)"), value: LogicAction.NextQ },
    ...nextScreens.map((s) => ({
      label: `${translations("JUMP TO")} => ${s.title}`,
      value: s.id,
    })),
  ];

  useEffect(() => {
    updateLogicJumps((draft) => {
      draft[index].action = selectedAction;
    });
  }, [selectedAction]);

  return (
    <div className="flex gap-6 bg-green-50 rounded-xl relative p-6 min-w-fit items-stretch">
      <div className="grow min-w-[350px]">
        <h5 className="text-base font-semibold mb-4 text-center">{translations("Conditions")}</h5>
        <div className="flex flex-col gap-4 text-left">
          {logic.conditions.map((condition, conditionIndex) => (
            <Fragment key={conditionIndex}>
              <AtomicConditionBlock
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
                <p className="text-center font-semibold text-sm my-2">{translations("AND")}</p>
              )}
            </Fragment>
          ))}

          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => {
              updateLogicJumps((draft) => {
                draft[index].conditions.push({
                  questionId: "",
                  condition: LogicCondition.Submitted,
                  response: undefined,
                });
              });
            }}
          >
            <IconPlus size={16} className="mr-2" />
            {translations("Add Condition")}
          </Button>
        </div>
      </div>
      <Field className="min-w-[300px] max-w-[350px]">
        <h5 className="text-base font-semibold text-center mb-4">{translations("Action")}</h5>
        <div className="flex grow rounded-lg p-6 bg-white items-center justify-center gap-2">
          <Field className="w-full">
            <FieldLabel htmlFor={`${uid}-field-5`}>{translations("Navigate to")}</FieldLabel>
            <Select
              value={selectedAction}
              onValueChange={(val) => val && setSelectedAction(val as LogicAction)}
              items={possibleActions}
            >
              <SelectTrigger id={`${uid}-field-5`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {possibleActions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Field>
    </div>
  );
}
