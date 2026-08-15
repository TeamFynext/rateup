import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useId, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { LogicAction, LogicCondition, QuestionType2 } from "@/types/enums.ts";
import type { FlowLogicCondition, FlowLogicJump } from "@/types/global";
import { logicSupportedTypes3 } from "@/utils/data.ts";
import { getConditionsv2, getResponses2 } from "@/utils/survey/logic/logic.utils";

import useFlowStoreV3 from "../utils/store.ts";

interface LogicJumpModalProps {
  opened: boolean;
  onClose: () => void;
  /** The element the jump is anchored to; absent for an element that has not been saved yet. */
  elementId: string | undefined;
}

export function LogicJumpModal({ opened, onClose, elementId }: LogicJumpModalProps) {
  const uid = useId();
  const { t: translations } = useTranslation();
  const { getCurrentScreen, getScreens, getLogicJumps, updateLogicJumps } = useFlowStoreV3();

  const currentScreen = getCurrentScreen();
  const screens = getScreens();
  const [openedAccordion, setOpenedAccordion] = useState<string | undefined>(undefined);
  const [localJumps, setLocalJumps] = useState<FlowLogicJump[]>([]);
  const initializedRef = useRef(false);

  const handleAddJump = () => {
    const newIndex = localJumps.length;
    setLocalJumps([
      ...localJumps,
      {
        conditions: [
          {
            questionId: elementId ?? "",
            condition: LogicCondition.Submitted,
            response: undefined,
          },
        ],
        action: LogicAction.NextQ,
      },
    ]);
    setOpenedAccordion(`jump-${newIndex}`);
  };

  useEffect(() => {
    if (opened && !initializedRef.current) {
      const logicJumps = getLogicJumps(currentScreen?.id || "");
      // This modal edits screen-level jumps only; component-level entries are
      // filtered out by the condition shape they carry.
      const elementLogicJumps = (logicJumps || []).filter(
        (jump): jump is FlowLogicJump =>
          jump.conditions?.some((cond) => cond.questionId === elementId) ?? false,
      );
      setLocalJumps(elementLogicJumps.length > 0 ? [...elementLogicJumps] : []);
      initializedRef.current = true;
    }
    if (!opened) {
      initializedRef.current = false;
    }
  }, [opened, elementId, currentScreen?.id, getLogicJumps]);

  const filteredQuestions = useMemo(() => {
    if (!currentScreen) return [];
    return currentScreen.layout.children.filter(({ label, type, metaType }) => {
      const qType = metaType || type;
      return (
        label && logicSupportedTypes3.includes(QuestionType2[qType as keyof typeof QuestionType2])
      );
    });
  }, [currentScreen]);

  const questions = useMemo(
    () =>
      filteredQuestions.map((comp) => ({
        label: comp.label || comp.text,
        value: comp.id,
      })),
    [filteredQuestions],
  );

  const screenOptions = useMemo(
    () =>
      screens.map((screen) => ({
        label: screen.title || screen.id,
        value: screen.id,
      })),
    [screens],
  );

  /**
   * A jump's action is either a screen id to navigate to, or one of the two
   * control actions the endpoint understands: carry on to the next screen, or
   * end the run here — saving what has been answered so far and closing the flow.
   */
  const actionOptions = useMemo(
    () => [
      { label: translations("Next Screen (default)"), value: LogicAction.NextQ as string },
      { label: translations("End Survey"), value: LogicAction.EndSurvey as string },
      ...screenOptions,
    ],
    [screenOptions, translations],
  );

  const getConditions = (questionId: string) => {
    if (!questionId) return [];
    const question = filteredQuestions.find((q) => q.id === questionId);
    if (!question) return [];

    try {
      const qType = question.metaType || question.type;
      const conditions = getConditionsv2(qType);
      return (conditions || []).map((c) => ({ label: String(c), value: c })).filter((c) => c.value);
    } catch (error) {
      console.error("Error getting conditions:", error);
      return [];
    }
  };

  const getResponseOptions = (questionId: string) => {
    if (!questionId) return [];
    const question = filteredQuestions.find((q) => q.id === questionId);
    if (!question) return [];

    try {
      const responses = getResponses2(question);
      if (!responses || responses.length === 0) return [];
      return responses
        .map((r) => {
          if (typeof r === "string") {
            return { label: r, value: r };
          }
          if (typeof r === "object" && r !== null) {
            return {
              label: r.label || String(r.value || r),
              value: r.value !== undefined ? r.value : r.label || String(r),
            };
          }
          return { label: String(r), value: String(r) };
        })
        .filter((r) => r.value);
    } catch (error) {
      console.error("Error getting response options:", error);
      return [];
    }
  };

  const handleUpdateCondition = (
    jumpIndex: number,
    conditionIndex: number,
    field: keyof FlowLogicCondition,
    // Every editable field is chosen from a `Select`, which hands back `null` when cleared.
    value: string | null,
  ) => {
    const updated = [...localJumps];

    const jump = updated[jumpIndex];

    // ✅ clone conditions array
    const conditions = [...jump.conditions];

    if (field === "questionId") {
      conditions[conditionIndex] = {
        questionId: value ?? "",
        condition: LogicCondition.Submitted,
        response: undefined,
      };
    } else {
      conditions[conditionIndex] = {
        ...conditions[conditionIndex],
        [field]: value,
      };
    }

    // ✅ assign cloned array back
    updated[jumpIndex] = {
      ...jump,
      conditions,
    };

    setLocalJumps(updated);
  };

  const handleAddCondition = (jumpIndex: number) => {
    setLocalJumps((prev) =>
      prev.map((jump, i) =>
        i === jumpIndex
          ? {
              ...jump,
              conditions: [
                ...jump.conditions,
                {
                  questionId: elementId ?? "",
                  condition: LogicCondition.Submitted,
                  response: undefined,
                },
              ],
            }
          : jump,
      ),
    );
  };

  const handleRemoveCondition = (jumpIndex: number, conditionIndex: number) => {
    setLocalJumps((prev) =>
      prev.map((jump, i) =>
        i === jumpIndex
          ? {
              ...jump,
              conditions: jump.conditions.filter((_, idx) => idx !== conditionIndex),
            }
          : jump,
      ),
    );
  };

  const handleUpdateAction = (jumpIndex: number, action: string | null) => {
    const updated = [...localJumps];
    updated[jumpIndex].action = action ?? "";
    setLocalJumps(updated);
  };

  const handleRemoveJump = (jumpIndex: number) => {
    setLocalJumps((prev) => prev.filter((_, i) => i !== jumpIndex));
  };

  const handleSave = () => {
    if (!currentScreen) return;

    const allLogicJumps = getLogicJumps(currentScreen.id);

    const otherJumps = (allLogicJumps || []).filter(
      (jump) => !jump.conditions?.some((cond) => cond.questionId === elementId),
    );

    const allJumps = [...otherJumps, ...localJumps];

    updateLogicJumps(currentScreen.id, allJumps);
    onClose();
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-4xl h-[75vh] overflow-hidden p-0 gap-0 flex flex-col min-h-0">
        {/* Fixed header */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>{translations("Logic Jumps")}</DialogTitle>
        </DialogHeader>

        {/* Scrollable body — grows, shrinks, scrolls */}
        <div className="px-6 py-4 overflow-y-auto" style={{ flex: "1 1 0", minHeight: 0 }}>
          {localJumps.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {translations("No logic jumps configured for this element")}
            </p>
          ) : (
            <Accordion
              className="w-full space-y-3"
              value={[openedAccordion]}
              onValueChange={(value) => setOpenedAccordion(value?.[0])}
            >
              {localJumps.map((jump, jumpIndex) => (
                <AccordionItem
                  key={jumpIndex}
                  value={`jump-${jumpIndex}`}
                  className="border rounded-lg px-4 bg-muted/30 data-[state=open]:bg-muted/50 transition-colors"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {translations("Logic Jump")} #{jumpIndex + 1}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex flex-col gap-4">
                      {/* ── Conditions ── */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <p className="font-semibold text-sm">{translations("Conditions")}</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAddCondition(jumpIndex)}
                          >
                            <IconPlus size={14} className="mr-1" />
                            {translations("Add Condition")}
                          </Button>
                        </div>

                        <div className="flex flex-col gap-3">
                          {jump.conditions.map((condition, condIndex) => (
                            <div
                              key={condIndex}
                              className="grid gap-2 items-end"
                              style={{
                                gridTemplateColumns:
                                  condition.condition !== LogicCondition.Submitted
                                    ? "1fr 1fr 1fr auto"
                                    : "1fr 1fr auto",
                              }}
                            >
                              {/* Question */}
                              <Field className="min-w-0">
                                <FieldLabel
                                  htmlFor={`${uid}-field-${jumpIndex}`}
                                  className="text-xs mb-1 block"
                                >
                                  {translations("Question")}
                                </FieldLabel>
                                <Select
                                  value={condition.questionId}
                                  items={questions}
                                  onValueChange={(value) =>
                                    handleUpdateCondition(jumpIndex, condIndex, "questionId", value)
                                  }
                                >
                                  <SelectTrigger
                                    id={`${uid}-field-${jumpIndex}`}
                                    className="w-full truncate"
                                  >
                                    <SelectValue placeholder={translations("Select question")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {questions.map((q) => (
                                      <SelectItem key={q.value} value={q.value}>
                                        {q.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>

                              {/* Condition */}
                              <Field className="min-w-0">
                                <FieldLabel
                                  htmlFor={`${uid}-field-2-${jumpIndex}`}
                                  className="text-xs mb-1 block"
                                >
                                  {translations("Condition")}
                                </FieldLabel>
                                <Select
                                  value={condition.condition}
                                  items={getConditions(condition.questionId)}
                                  onValueChange={(value) =>
                                    handleUpdateCondition(jumpIndex, condIndex, "condition", value)
                                  }
                                >
                                  <SelectTrigger
                                    id={`${uid}-field-2-${jumpIndex}`}
                                    className="w-full truncate"
                                  >
                                    <SelectValue placeholder={translations("Select condition")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getConditions(condition.questionId).map((c) => (
                                      <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>

                              {/* Response (only when not Submitted) */}
                              {condition.condition !== LogicCondition.Submitted && (
                                <Field className="min-w-0">
                                  <FieldLabel
                                    htmlFor={`${uid}-field-3-${jumpIndex}`}
                                    className="text-xs mb-1 block"
                                  >
                                    {translations("Response")}
                                  </FieldLabel>
                                  <Select
                                    value={
                                      Array.isArray(condition.response) ? "" : condition.response
                                    }
                                    items={getResponseOptions(condition.questionId)}
                                    onValueChange={(value) =>
                                      handleUpdateCondition(jumpIndex, condIndex, "response", value)
                                    }
                                  >
                                    <SelectTrigger
                                      id={`${uid}-field-3-${jumpIndex}`}
                                      className="w-full truncate"
                                    >
                                      <SelectValue placeholder={translations("Select response")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getResponseOptions(condition.questionId).map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                          {r.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              )}

                              {/* Remove condition */}
                              {jump.conditions.length > 1 ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive shrink-0 self-end"
                                  onClick={() => handleRemoveCondition(jumpIndex, condIndex)}
                                >
                                  <IconTrash size={16} />
                                </Button>
                              ) : (
                                <div className="w-9 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Separator ── */}
                      <Separator />

                      {/* ── Action ── */}
                      <Field>
                        <p className="font-semibold text-sm mb-2">{translations("Action")}</p>
                        <Field className="max-w-xs">
                          <FieldLabel
                            htmlFor={`${uid}-field-4-${jumpIndex}`}
                            className="text-xs mb-1 block"
                          >
                            {translations("Navigate to")}
                          </FieldLabel>
                          <Select
                            value={typeof jump.action === "string" ? jump.action : ""}
                            items={actionOptions}
                            onValueChange={(value) => handleUpdateAction(jumpIndex, value)}
                          >
                            <SelectTrigger
                              id={`${uid}-field-4-${jumpIndex}`}
                              className="w-full truncate"
                            >
                              <SelectValue placeholder={translations("Select action")} />
                            </SelectTrigger>
                            <SelectContent>
                              {actionOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </Field>

                      {/* ── Remove Jump ── */}
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveJump(jumpIndex)}
                        >
                          <IconTrash size={14} className="mr-1.5" />
                          {translations("Remove Jump")}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          <Button onClick={handleAddJump} variant="secondary" className="w-full mt-3">
            <IconPlus size={16} className="mr-2" />
            {translations("Add Logic Jump")}
          </Button>
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t shrink-0">
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {translations("Cancel")}
            </Button>
            <Button onClick={handleSave}>{translations("Save Logic Jumps")}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
