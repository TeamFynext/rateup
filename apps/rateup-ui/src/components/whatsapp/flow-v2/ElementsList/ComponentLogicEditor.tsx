"use client";

import React, { useEffect, useMemo } from "react";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { QuestionType2 } from "@/types/enums.ts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { getResponses2 } from "@/utils/survey/logic/logic.utils";

import useFlowStoreV3 from "../utils/store.ts";

const operators2 = [
  { label: "==", value: "==" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: ">=", value: ">=" },
  { label: "<", value: "<" },
  { label: "<=", value: "<=" },
];

const operators = [
  { label: "==", value: "==" },
  { label: "!=", value: "!=" },
];

const logicalOperators = [
  { label: "AND", value: "&&" },
  { label: "OR", value: "||" },
];

interface ComponentLogicEditorProps {
  blocks: any[];
  setBlocks: (updater: any) => void;
}

export const ComponentLogicEditor = ({
  blocks,
  setBlocks,
}: ComponentLogicEditorProps) => {
  const { getCurrentScreen, currentScreenId } = useFlowStoreV3();
  const { t: translations } = useTranslation();

  const currentScreen = getCurrentScreen();

  const filteredQuestions =
    currentScreen?.layout.children.filter(
      ({ label, type }) => label && type !== QuestionType2.Footer,
    ) || [];

  const questions = filteredQuestions.map((comp) => ({
    label: comp.label,
    value: comp.id,
  }));

  const componentsList =
    currentScreen?.layout.children
      .filter(({ type }) => type !== QuestionType2.Footer)
      .map((comp) => ({
        label: comp.label || comp.text || comp.type,
        value: comp.id,
      })) || [];

  const getOperators = useMemo(() => {
    return (field: string) => {
      const question = filteredQuestions.find((qs) => qs.id === field);
      return question?.["input-type"] === "number" ? operators2 : operators;
    };
  }, [filteredQuestions]);

  useEffect(() => {
    blocks.forEach((block, index) => {
      if (block.type === "Switch") {
        ensurePredefinedCases(index);
      }
    });
  }, [blocks]);

  const addBlock = (type: "If" | "Switch") => {
    const newBlock = {
      type,
      conditions:
        type === "If"
          ? [{ field: "", operator: "", value: "", logic: "", isNumber: false }]
          : [],
      then: type === "If" ? [] : undefined,
      else: type === "If" ? [] : undefined,
      value: type === "Switch" ? "" : undefined,
      cases: type === "Switch" ? {} : undefined,
      screenId: currentScreenId,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateCondition = (
    blockIndex: number,
    conditionIndex: number,
    field: string,
    value: any,
  ) => {
    const updatedBlocks = [...blocks];
    if (field === "field") {
      updatedBlocks[blockIndex].conditions[conditionIndex].operator = null;
      updatedBlocks[blockIndex].conditions[conditionIndex].value = null;
    }

    if (!isNaN(value)) {
      updatedBlocks[blockIndex].conditions[conditionIndex].isNumber = true;
    }

    updatedBlocks[blockIndex].conditions[conditionIndex][field] = value;
    setBlocks(updatedBlocks);
  };

  const updateSwitchValue = (blockIndex: number, value: string) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].value = value;
    setBlocks(updatedBlocks);
  };

  const updateSwitchCaseComponents = (
    blockIndex: number,
    caseKey: string,
    components: string[],
  ) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].cases[caseKey] = components.map((type) => ({
      type,
      content: "",
    }));
    setBlocks(updatedBlocks);
  };

  const updateSwitchCaseKey = (
    blockIndex: number,
    oldKey: string,
    newKey: string,
  ) => {
    const updatedBlocks = [...blocks];
    const components = updatedBlocks[blockIndex].cases[oldKey];
    delete updatedBlocks[blockIndex].cases[oldKey];
    updatedBlocks[blockIndex].cases[newKey] = components;
    setBlocks(updatedBlocks);
  };

  const removeSwitchCase = (blockIndex: number, caseKey: string) => {
    const updatedBlocks = [...blocks];
    delete updatedBlocks[blockIndex].cases[caseKey];
    setBlocks(updatedBlocks);
  };

  const addCondition = (blockIndex: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].conditions.push({
      field: "",
      operator: "",
      value: "",
      logic: "&&",
    });
    setBlocks(updatedBlocks);
  };

  const removeCondition = (blockIndex: number, conditionIndex: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].conditions = updatedBlocks[
      blockIndex
    ].conditions.filter((_: any, i: number) => i !== conditionIndex);
    setBlocks(updatedBlocks);
  };

  const addComponent = (
    blockIndex: number,
    key: string,
    componentTypes: string[],
  ) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex][key] = componentTypes;
    setBlocks(updatedBlocks);
  };

  const addSwitchCase = (blockIndex: number, caseKey: string) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].cases[caseKey] = [];
    setBlocks(updatedBlocks);
  };

  const ensurePredefinedCases = (blockIndex: number) => {
    const updatedBlocks = [...blocks];
    if (!updatedBlocks[blockIndex].cases["Case 1"]) {
      updatedBlocks[blockIndex].cases["Case 1"] = [];
    }
    if (!updatedBlocks[blockIndex].cases["Case 2"]) {
      updatedBlocks[blockIndex].cases["Case 2"] = [];
    }
    if (!updatedBlocks[blockIndex].cases["default"]) {
      updatedBlocks[blockIndex].cases["default"] = [];
    }
    setBlocks(updatedBlocks);
  };

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div className="mb-2">
        <h3 className="text-lg font-semibold mb-2">
          {translations("Component Jump")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {translations("Show or hide components based on conditions")}
        </p>
      </div>
      <Accordion type="multiple" className="w-full">
        {blocks.map((block, index) => (
          <AccordionItem value={`block-${index}`} key={index}>
            <AccordionTrigger>
              <div className="flex justify-between items-center w-full pr-4">
                <span className="font-medium">
                  {block.type} {translations("Block")} {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBlocks(
                      blocks.filter((_: any, i: number) => i !== index),
                    );
                  }}
                >
                  <IconTrash size={16} />
                </Button>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-4 pt-4">
                {block.type === "If" && (
                  <>
                    <h4 className="text-sm font-semibold">
                      {translations("Conditions")}:
                    </h4>
                    {block.conditions.map(
                      (condition: any, condIndex: number) => {
                        const q = filteredQuestions.find(
                          (qs) => qs.id === condition.field,
                        );
                        const operatorData = q && getResponses2(q);
                        return (
                          <div
                            key={condIndex}
                            className="flex gap-2 items-start"
                          >
                            <div className="flex-1 space-y-1.5">
                              <Label className="text-xs">
                                {translations("Question")}
                              </Label>
                              <Select
                                value={condition.field}
                                onValueChange={(value) => {
                                  updateCondition(
                                    index,
                                    condIndex,
                                    "field",
                                    value,
                                  );
                                }}
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
                            <div className="flex-1 space-y-1.5">
                              <Label className="text-xs">
                                {translations("Operator")}
                              </Label>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) => {
                                  updateCondition(
                                    index,
                                    condIndex,
                                    "operator",
                                    value,
                                  );
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={translations(
                                      "Select operator",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {getOperators(condition.field).map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {operatorData ? (
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-xs">
                                  {translations("Value")}
                                </Label>
                                <Select
                                  value={condition.value}
                                  onValueChange={(value) => {
                                    updateCondition(
                                      index,
                                      condIndex,
                                      "value",
                                      value,
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={translations("Select value")}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operatorData.map((item: any) => (
                                      <SelectItem
                                        key={item.value}
                                        value={item.value}
                                      >
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-xs">
                                  {translations("Value")}
                                </Label>
                                <Input
                                  placeholder={translations("Enter value")}
                                  value={condition.value}
                                  type={q?.["input-type"] || "text"}
                                  onChange={(e) => {
                                    const value =
                                      q?.["input-type"] === "number"
                                        ? Number(e.target.value)
                                        : e.target.value;
                                    updateCondition(
                                      index,
                                      condIndex,
                                      "value",
                                      value,
                                    );
                                  }}
                                />
                              </div>
                            )}
                            {condIndex > 0 && (
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-xs">
                                  {translations("Logic")}
                                </Label>
                                <Select
                                  value={condition.logic}
                                  onValueChange={(value) => {
                                    updateCondition(
                                      index,
                                      condIndex,
                                      "logic",
                                      value,
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={translations("Select logic")}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {logicalOperators.map((op) => (
                                      <SelectItem
                                        key={op.value}
                                        value={op.value}
                                      >
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mt-7"
                              onClick={() => removeCondition(index, condIndex)}
                              disabled={condIndex === 0}
                            >
                              <IconTrash size={16} />
                            </Button>
                          </div>
                        );
                      },
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => addCondition(index)}
                    >
                      <IconPlus size={14} className="mr-2" />
                      {translations("Add Condition")}
                    </Button>
                  </>
                )}

                {block.type === "Switch" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {translations("Question")}
                      </Label>
                      <Select
                        value={block.value}
                        onValueChange={(value) =>
                          updateSwitchValue(index, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={translations("Select question")}
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
                    {Object.keys(block.cases).map((caseKey, caseIndex) => (
                      <div key={caseIndex} className="flex flex-col gap-3">
                        {caseKey !== "default" ? (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1.5">
                              <Label className="text-xs">{`${translations("Case")} ${caseKey}`}</Label>
                              <Input
                                placeholder={translations("Enter case key")}
                                value={caseKey}
                                onChange={(e) =>
                                  updateSwitchCaseKey(
                                    index,
                                    caseKey,
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            {caseIndex > 2 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeSwitchCase(index, caseKey)}
                              >
                                <IconTrash size={16} />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <h4 className="text-sm font-semibold">{`${translations("Case")} ${caseKey}`}</h4>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {translations("Add Components")}
                          </Label>
                          <MultiSelect
                            placeholder={translations("Select component")}
                            options={componentsList.map((item) => ({
                              label: item.label,
                              value: item.value,
                            }))}
                            defaultValue={block.cases[caseKey].map(
                              (comp: any) => comp.type,
                            )}
                            onValueChange={(value: string[]) =>
                              updateSwitchCaseComponents(index, caseKey, value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        addSwitchCase(
                          index,
                          `Case ${Object.keys(block.cases).length}`,
                        )
                      }
                    >
                      <IconPlus size={14} className="mr-2" />
                      {translations("Add new Case")}
                    </Button>
                  </>
                )}
              </div>

              {block.type === "If" && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3">
                      <h4 className="text-sm font-semibold">
                        {translations("Then")}:
                      </h4>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {translations("Add Then Component")}
                        </Label>
                        <MultiSelect
                          placeholder={translations("Select component")}
                          options={componentsList
                            ?.map((d) => ({
                              label: d.label ?? d.value,
                              value: d.value,
                            }))
                            .filter((component) => {
                              const isInElse = block.else?.includes(
                                component.value,
                              );
                              const isInConditions = block.conditions?.some(
                                (condition: any) =>
                                  condition?.field === component.value,
                              );
                              return !isInElse && !isInConditions;
                            })}
                          defaultValue={block.then || []}
                          onValueChange={(value: string[]) =>
                            addComponent(index, "then", value)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h4 className="text-sm font-semibold">
                        {translations("Else")}:
                      </h4>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {translations("Add Else Component")}
                        </Label>
                        <MultiSelect
                          placeholder={translations("Select component")}
                          options={componentsList
                            ?.map((d) => ({
                              label: d?.label ?? d.value,
                              value: d.value,
                            }))
                            .filter((component) => {
                              const isInThen = block.then?.includes(
                                component.value,
                              );
                              const isInConditions = block.conditions?.some(
                                (condition: any) =>
                                  condition?.field === component.value,
                              );
                              return !isInThen && !isInConditions;
                            })}
                          defaultValue={block.else || []}
                          onValueChange={(value: string[]) =>
                            addComponent(index, "else", value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => addBlock("If")}
        >
          <IconPlus size={16} className="mr-2" />
          {translations("Add If Block")}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => addBlock("Switch")}
        >
          <IconPlus size={16} className="mr-2" />
          {translations("Add Switch Block")}
        </Button>
      </div>
    </div>
  );
};

// Export both named and default
export default ComponentLogicEditor;
