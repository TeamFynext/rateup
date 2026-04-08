"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { LogicAction, LogicCondition, QuestionType2 } from "@/types/enums";
import { FlowLogicJump } from "@/types/global";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { logicSupportedTypes3 } from "@/utils/data";
import {
  getConditionsv2,
  getResponses2,
} from "@/utils/survey/logic/logic.utils";

import useFlowStoreV3 from "../utils/store";

interface LogicJumpModalProps {
  opened: boolean;
  onClose: () => void;
  elementId: string;
}

export function LogicJumpModal({
  opened,
  onClose,
  elementId,
}: LogicJumpModalProps) {
  const translations = useExtracted();
  const { getCurrentScreen, getScreens, getLogicJumps, updateLogicJumps } =
    useFlowStoreV3();

  const currentScreen = getCurrentScreen();
  const screens = getScreens();
  const [openedAccordion, setOpenedAccordion] = useState<string | undefined>(
    undefined,
  );
  const [localJumps, setLocalJumps] = useState<FlowLogicJump[]>([]);
  const initializedRef = useRef(false);

  const handleAddJump = () => {
    const newIndex = localJumps.length;
    setLocalJumps([
      ...localJumps,
      {
        conditions: [
          {
            questionId: elementId,
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
      const elementLogicJumps = (logicJumps || []).filter((jump: any) =>
        jump.conditions?.some((cond: any) => cond.questionId === elementId),
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
        label &&
        logicSupportedTypes3.includes(
          QuestionType2[qType as keyof typeof QuestionType2],
        )
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

  const getConditions = (questionId: string) => {
    if (!questionId) return [];
    const question = filteredQuestions.find((q) => q.id === questionId);
    if (!question) return [];

    try {
      const qType = question.metaType || question.type;
      const conditions = getConditionsv2(qType as any);
      return (conditions || [])
        .map((c) => ({
          label: c?.label || String(c?.value || c),
          value: c?.value || c?.label || String(c),
        }))
        .filter((c) => c.value);
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
      const responses = getResponses2(question as any);
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
    field: string,
    value: any,
  ) => {
    const updated = [...localJumps];

    const jump = updated[jumpIndex];

    // ✅ clone conditions array
    const conditions = [...jump.conditions];

    if (field === "questionId") {
      conditions[conditionIndex] = {
        questionId: value,
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
                  questionId: elementId,
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
              conditions: jump.conditions.filter(
                (_, idx) => idx !== conditionIndex,
              ),
            }
          : jump,
      ),
    );
  };

  const handleUpdateAction = (jumpIndex: number, action: any) => {
    const updated = [...localJumps];
    updated[jumpIndex].action = action;
    setLocalJumps(updated);
  };

  const handleRemoveJump = (jumpIndex: number) => {
    setLocalJumps((prev) => prev.filter((_, i) => i !== jumpIndex));
  };

  const handleSave = () => {
    if (!currentScreen) return;

    const allLogicJumps = getLogicJumps(currentScreen.id);

    const otherJumps = (allLogicJumps || []).filter(
      (jump: any) =>
        !jump.conditions?.some((cond: any) => cond.questionId === elementId),
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
        <div
          className="px-6 py-4 overflow-y-auto"
          style={{ flex: "1 1 0", minHeight: 0 }}
        >
          {localJumps.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {translations("No logic jumps configured for this element")}
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              className="w-full space-y-3"
              value={openedAccordion}
              onValueChange={setOpenedAccordion}
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
                          <p className="font-semibold text-sm">
                            {translations("Conditions")}
                          </p>
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
                                  condition.condition !==
                                  LogicCondition.Submitted
                                    ? "1fr 1fr 1fr auto"
                                    : "1fr 1fr auto",
                              }}
                            >
                              {/* Question */}
                              <div className="min-w-0">
                                <Label className="text-xs mb-1 block">
                                  {translations("Question")}
                                </Label>
                                <Select
                                  value={condition.questionId}
                                  onValueChange={(value) =>
                                    handleUpdateCondition(
                                      jumpIndex,
                                      condIndex,
                                      "questionId",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full truncate">
                                    <SelectValue
                                      placeholder={translations(
                                        "Select question",
                                      )}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {questions.map((q) => (
                                      <SelectItem key={q.value} value={q.value}>
                                        {q.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Condition */}
                              <div className="min-w-0">
                                <Label className="text-xs mb-1 block">
                                  {translations("Condition")}
                                </Label>
                                <Select
                                  value={condition.condition}
                                  onValueChange={(value) =>
                                    handleUpdateCondition(
                                      jumpIndex,
                                      condIndex,
                                      "condition",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full truncate">
                                    <SelectValue
                                      placeholder={translations(
                                        "Select condition",
                                      )}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getConditions(condition.questionId).map(
                                      (c: any) => (
                                        <SelectItem
                                          key={c.value}
                                          value={c.value}
                                        >
                                          {c.label}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Response (only when not Submitted) */}
                              {condition.condition !==
                                LogicCondition.Submitted && (
                                <div className="min-w-0">
                                  <Label className="text-xs mb-1 block">
                                    {translations("Response")}
                                  </Label>
                                  <Select
                                    value={condition.response}
                                    onValueChange={(value) =>
                                      handleUpdateCondition(
                                        jumpIndex,
                                        condIndex,
                                        "response",
                                        value,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full truncate">
                                      <SelectValue
                                        placeholder={translations(
                                          "Select response",
                                        )}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getResponseOptions(
                                        condition.questionId,
                                      ).map((r: any) => (
                                        <SelectItem
                                          key={r.value}
                                          value={r.value}
                                        >
                                          {r.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Remove condition */}
                              {jump.conditions.length > 1 ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive shrink-0 self-end"
                                  onClick={() =>
                                    handleRemoveCondition(jumpIndex, condIndex)
                                  }
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
                      <div>
                        <p className="font-semibold text-sm mb-2">
                          {translations("Action")}
                        </p>
                        <div className="max-w-xs">
                          <Label className="text-xs mb-1 block">
                            {translations("Navigate to Screen")}
                          </Label>
                          <Select
                            value={
                              typeof jump.action === "string" ? jump.action : ""
                            }
                            onValueChange={(value) =>
                              handleUpdateAction(jumpIndex, value)
                            }
                          >
                            <SelectTrigger className="w-full truncate">
                              <SelectValue
                                placeholder={translations(
                                  "Select target screen",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {screenOptions.map((screen) => (
                                <SelectItem
                                  key={screen.value}
                                  value={screen.value}
                                >
                                  {screen.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

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

          <Button
            onClick={handleAddJump}
            variant="secondary"
            className="w-full mt-3"
          >
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
            <Button onClick={handleSave}>
              {translations("Save Logic Jumps")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
