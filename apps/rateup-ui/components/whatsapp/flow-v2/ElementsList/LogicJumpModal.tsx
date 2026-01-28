"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

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
  const translations = useTranslations();
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
      // Filter logic jumps for this specific element
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

  // Get questions from current screen that support logic
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

  // Get available screens for navigation
  const screenOptions = useMemo(
    () =>
      screens.map((screen) => ({
        label: screen.title || screen.id,
        value: screen.id,
      })),
    [screens],
  );

  // Get conditions for a specific question
  const getConditions = (questionId: string) => {
    if (!questionId) return [];
    const question = filteredQuestions.find((q) => q.id === questionId);
    if (!question) return [];

    try {
      const qType =
        QuestionType2[question.metaType as keyof typeof QuestionType2] ||
        QuestionType2[question.type as keyof typeof QuestionType2];
      const conditions = getConditionsv2(qType as any);
      // Ensure conditions have proper label/value format
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

  // Get responses for a specific question
  const getResponseOptions = (questionId: string) => {
    if (!questionId) return [];
    const question = filteredQuestions.find((q) => q.id === questionId);
    if (!question) return [];

    try {
      const responses = getResponses2(question as any);
      // Ensure responses have proper label/value format
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
    if (field === "questionId") {
      // Reset condition and response when question changes
      updated[jumpIndex].conditions[conditionIndex] = {
        questionId: value,
        condition: LogicCondition.Submitted,
        response: undefined,
      };
    } else {
      updated[jumpIndex].conditions[conditionIndex] = {
        ...updated[jumpIndex].conditions[conditionIndex],
        [field]: value,
      };
    }
    setLocalJumps(updated);
  };

  const handleAddCondition = (jumpIndex: number) => {
    const updated = [...localJumps];
    updated[jumpIndex].conditions.push({
      questionId: elementId,
      condition: LogicCondition.Submitted,
      response: undefined,
    });
    setLocalJumps(updated);
  };

  const handleRemoveCondition = (jumpIndex: number, conditionIndex: number) => {
    const updated = [...localJumps];
    updated[jumpIndex].conditions.splice(conditionIndex, 1);
    setLocalJumps(updated);
  };

  const handleUpdateAction = (jumpIndex: number, action: any) => {
    const updated = [...localJumps];
    updated[jumpIndex].action = action;
    setLocalJumps(updated);
  };

  const handleRemoveJump = (jumpIndex: number) => {
    const updated = [...localJumps];
    updated.splice(jumpIndex, 1);
    setLocalJumps(updated);
  };

  const handleSave = () => {
    if (!currentScreen) return;

    // Get all existing logic jumps for this screen
    const allLogicJumps = getLogicJumps(currentScreen.id);

    // Filter out jumps for this element
    const otherJumps = (allLogicJumps || []).filter(
      (jump: any) =>
        !jump.conditions?.some((cond: any) => cond.questionId === elementId),
    );

    // Combine with updated jumps for this element
    const allJumps = [...otherJumps, ...localJumps];

    // Update in store
    updateLogicJumps(currentScreen.id, allJumps);
    onClose();
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{translations("Logic Jumps")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {localJumps.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {translations("No logic jumps configured for this element")}
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              className="w-full space-y-4"
              value={openedAccordion}
              onValueChange={setOpenedAccordion}
            >
              {localJumps.map((jump, jumpIndex) => (
                <AccordionItem
                  key={jumpIndex}
                  value={`jump-${jumpIndex}`}
                  className="border rounded-lg px-4 bg-muted/30 data-[state=open]:bg-muted/50 transition-colors"
                  style={{ marginBottom: "1rem" }}
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2 font-medium">
                      {translations("Logic Jump")} #{jumpIndex + 1}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="flex flex-col gap-4">
                      {/* Conditions */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold">
                            {translations("Conditions")}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAddCondition(jumpIndex)}
                          >
                            <IconPlus size={14} className="mr-2" />
                            {translations("Add Condition")}
                          </Button>
                        </div>

                        {jump.conditions.map((condition, condIndex) => (
                          <div
                            key={condIndex}
                            className="flex gap-2 items-start mb-2"
                          >
                            <div className="flex-1">
                              <Label>{translations("Question")}</Label>
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
                                <SelectTrigger>
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

                            <div className="flex-1">
                              <Label>{translations("Condition")}</Label>
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
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={translations(
                                      "Select condition",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {getConditions(condition.questionId).map(
                                    (c: any) => (
                                      <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {condition.condition !==
                              LogicCondition.Submitted && (
                              <div className="flex-1">
                                <Label>{translations("Response")}</Label>
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
                                  <SelectTrigger>
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
                                      <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {jump.conditions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive mt-6"
                                onClick={() =>
                                  handleRemoveCondition(jumpIndex, condIndex)
                                }
                              >
                                <IconTrash size={16} />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Action */}
                      <div>
                        <p className="font-semibold mb-2">
                          {translations("Action")}
                        </p>
                        <div>
                          <Label>{translations("Navigate to Screen")}</Label>
                          <Select
                            value={
                              typeof jump.action === "string" ? jump.action : ""
                            }
                            onValueChange={(value) =>
                              handleUpdateAction(jumpIndex, value)
                            }
                          >
                            <SelectTrigger>
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

                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          onClick={() => handleRemoveJump(jumpIndex)}
                        >
                          <IconTrash size={16} className="mr-2" />
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
            className="w-full"
          >
            <IconPlus size={16} className="mr-2" />
            {translations("Add Logic Jump")}
          </Button>

          <Separator />

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
