import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useId, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { QuestionType2 } from "@/types/enums.ts";
import type { FlowLogicJumpComponentLevel } from "@/types/global";
import { toSelectOptions } from "@/utils/select-options.ts";
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
  blocks: FlowLogicJumpComponentLevel[];
  setBlocks: (blocks: FlowLogicJumpComponentLevel[]) => void;
}

const ComponentLogicEditor = ({ blocks, setBlocks }: ComponentLogicEditorProps) => {
  const uid = useId();
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
    // Only the fields for the chosen block type are populated; the rest stay
    // `undefined` so the saved JSON keeps the shape the flow builder expects.
    const newBlock: FlowLogicJumpComponentLevel = {
      type,
      conditions:
        type === "If" ? [{ field: "", operator: "", value: "", logic: "", isNumber: false }] : [],
      // eslint-disable-next-line unicorn/no-thenable
      then: type === "If" ? [] : undefined,
      else: type === "If" ? [] : undefined,
      value: type === "Switch" ? "" : undefined,
      cases: type === "Switch" ? {} : undefined,
      screenId: currentScreenId ?? "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateCondition = (
    blockIndex: number,
    conditionIndex: number,
    field: string,
    value: string | number | boolean | null,
  ) => {
    const updatedBlocks = [...blocks];
    if (field === "field") {
      updatedBlocks[blockIndex].conditions[conditionIndex].operator = null;
      updatedBlocks[blockIndex].conditions[conditionIndex].value = null;
    }

    if (typeof value === "string" && value !== "" && !isNaN(Number(value))) {
      const numeric = updatedBlocks[blockIndex]?.conditions[conditionIndex];
      if (numeric) numeric.isNumber = true;
    }

    const condition = updatedBlocks[blockIndex]?.conditions[conditionIndex];
    if (condition && (field === "operator" || field === "value" || field === "logic")) {
      condition[field] = value === null ? null : String(value);
    } else if (condition && field === "field") {
      condition.field = value === null ? "" : String(value);
    }
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
    const block = updatedBlocks[blockIndex];
    if (!block) return;
    block.cases = { ...block.cases, [caseKey]: components.map((type) => ({ type, content: "" })) };
    setBlocks(updatedBlocks);
  };

  const updateSwitchCaseKey = (blockIndex: number, oldKey: string, newKey: string) => {
    const updatedBlocks = [...blocks];
    const block = updatedBlocks[blockIndex];
    if (!block?.cases) return;
    const components = block.cases[oldKey] ?? [];
    delete block.cases[oldKey];
    block.cases[newKey] = components;
    setBlocks(updatedBlocks);
  };

  const removeSwitchCase = (blockIndex: number, caseKey: string) => {
    const updatedBlocks = [...blocks];
    delete updatedBlocks[blockIndex]?.cases?.[caseKey];
    setBlocks(updatedBlocks);
  };

  const addCondition = (blockIndex: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex]?.conditions.push({
      field: "",
      operator: "",
      value: "",
      logic: "&&",
      isNumber: false,
    });
    setBlocks(updatedBlocks);
  };

  const removeCondition = (blockIndex: number, conditionIndex: number) => {
    const updatedBlocks = [...blocks];
    const block = updatedBlocks[blockIndex];
    if (!block) return;
    block.conditions = block.conditions.filter((_, i: number) => i !== conditionIndex);
    setBlocks(updatedBlocks);
  };

  const addComponent = (blockIndex: number, key: "then" | "else", componentTypes: string[]) => {
    const updatedBlocks = [...blocks];
    const block = updatedBlocks[blockIndex];
    if (!block) return;
    block[key] = componentTypes;
    setBlocks(updatedBlocks);
  };

  const addSwitchCase = (blockIndex: number, caseKey: string) => {
    const updatedBlocks = [...blocks];
    const block = updatedBlocks[blockIndex];
    if (!block) return;
    block.cases = { ...block.cases, [caseKey]: [] };
    setBlocks(updatedBlocks);
  };

  const ensurePredefinedCases = (blockIndex: number) => {
    const updatedBlocks = [...blocks];
    const block = updatedBlocks[blockIndex];
    if (!block) return;
    const cases = { ...block.cases };
    for (const key of ["Case 1", "Case 2", "default"]) {
      cases[key] ??= [];
    }
    block.cases = cases;
    setBlocks(updatedBlocks);
  };

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div className="mb-2">
        <h3 className="text-lg font-semibold mb-2">{translations("Component Jump")}</h3>
        <p className="text-sm text-muted-foreground">
          {translations("Show or hide components based on conditions")}
        </p>
      </div>
      <Accordion multiple className="w-full">
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
                    setBlocks(blocks.filter((_, i: number) => i !== index));
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
                    <h4 className="text-sm font-semibold">{translations("Conditions")}:</h4>
                    {block.conditions.map((condition, condIndex: number) => {
                      const q = filteredQuestions.find((qs) => qs.id === condition.field);
                      const operatorData = q && getResponses2(q);
                      return (
                        <div key={condIndex} className="flex gap-2 items-start">
                          <Field className="flex-1">
                            <FieldLabel htmlFor={`${uid}-field-${index}`} className="text-xs">
                              {translations("Question")}
                            </FieldLabel>
                            <Select
                              value={condition.field}
                              onValueChange={(value) => {
                                updateCondition(index, condIndex, "field", value);
                              }}
                              items={questions}
                            >
                              <SelectTrigger id={`${uid}-field-${index}`}>
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
                          <Field className="flex-1">
                            <FieldLabel htmlFor={`${uid}-field-2-${index}`} className="text-xs">
                              {translations("Operator")}
                            </FieldLabel>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) => {
                                updateCondition(index, condIndex, "operator", value);
                              }}
                              items={getOperators(condition.field ?? "")}
                            >
                              <SelectTrigger id={`${uid}-field-2-${index}`}>
                                <SelectValue placeholder={translations("Select operator")} />
                              </SelectTrigger>
                              <SelectContent>
                                {getOperators(condition.field ?? "").map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          {operatorData ? (
                            <Field className="flex-1">
                              <FieldLabel htmlFor={`${uid}-field-3-${index}`} className="text-xs">
                                {translations("Value")}
                              </FieldLabel>
                              <Select
                                value={condition.value ?? ""}
                                onValueChange={(value) => {
                                  updateCondition(index, condIndex, "value", value);
                                }}
                                items={toSelectOptions(operatorData)}
                              >
                                <SelectTrigger id={`${uid}-field-3-${index}`}>
                                  <SelectValue placeholder={translations("Select value")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {toSelectOptions(operatorData).map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                          ) : (
                            <Field className="flex-1">
                              <FieldLabel htmlFor={`${uid}-field-4-${index}`} className="text-xs">
                                {translations("Value")}
                              </FieldLabel>
                              <Input
                                id={`${uid}-field-4-${index}`}
                                placeholder={translations("Enter value")}
                                value={condition.value ?? ""}
                                type={q?.["input-type"] || "text"}
                                onChange={(e) => {
                                  const value =
                                    q?.["input-type"] === "number"
                                      ? Number(e.target.value)
                                      : e.target.value;
                                  updateCondition(index, condIndex, "value", value);
                                }}
                              />
                            </Field>
                          )}
                          {condIndex > 0 && (
                            <Field className="flex-1">
                              <FieldLabel htmlFor={`${uid}-field-5-${index}`} className="text-xs">
                                {translations("Logic")}
                              </FieldLabel>
                              <Select
                                value={condition.logic}
                                onValueChange={(value) => {
                                  updateCondition(index, condIndex, "logic", value);
                                }}
                                items={logicalOperators}
                              >
                                <SelectTrigger id={`${uid}-field-5-${index}`}>
                                  <SelectValue placeholder={translations("Select logic")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {logicalOperators.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
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
                    })}
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
                    <Field>
                      <FieldLabel htmlFor={`${uid}-field-6-${index}`} className="text-xs">
                        {translations("Question")}
                      </FieldLabel>
                      <Select
                        value={block.value}
                        onValueChange={(value) => updateSwitchValue(index, value ?? "")}
                        items={questions}
                      >
                        <SelectTrigger id={`${uid}-field-6-${index}`}>
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
                    {Object.keys(block.cases ?? {}).map((caseKey, caseIndex) => (
                      <div key={caseIndex} className="flex flex-col gap-3">
                        {caseKey !== "default" ? (
                          <Field className="items-end">
                            <Field className="flex-1">
                              <FieldLabel
                                htmlFor={`${uid}-field-7-${index}`}
                                className="text-xs"
                              >{`${translations("Case")} ${caseKey}`}</FieldLabel>
                              <Input
                                id={`${uid}-field-7-${index}`}
                                placeholder={translations("Enter case key")}
                                value={caseKey}
                                onChange={(e) =>
                                  updateSwitchCaseKey(index, caseKey, e.target.value)
                                }
                              />
                            </Field>
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
                          </Field>
                        ) : (
                          <h4 className="text-sm font-semibold">{`${translations("Case")} ${caseKey}`}</h4>
                        )}
                        <Field>
                          <FieldLabel htmlFor={`${uid}-field-8-${index}`} className="text-xs">
                            {translations("Add Components")}
                          </FieldLabel>
                          <MultiSelect
                            id={`${uid}-field-8-${index}`}
                            options={componentsList.map((item) => ({
                              label: item.label ?? "",
                              value: item.value ?? "",
                            }))}
                            value={(block.cases?.[caseKey] ?? []).map((comp) => comp.type)}
                            onValueChange={(value: string[]) =>
                              updateSwitchCaseComponents(index, caseKey, value)
                            }
                            placeholder={translations("Select component")}
                            emptyIndicator="No items found."
                          />
                        </Field>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        addSwitchCase(index, `Case ${Object.keys(block.cases ?? {}).length}`)
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
                    <Field>
                      <h4 className="text-sm font-semibold">{translations("Then")}:</h4>
                      <Field>
                        <FieldLabel htmlFor={`${uid}-field-9-${index}`} className="text-xs">
                          {translations("Add Then Component")}
                        </FieldLabel>
                        <MultiSelect
                          id={`${uid}-field-9-${index}`}
                          options={componentsList
                            ?.map((d) => ({
                              label: d.label ?? d.value ?? "",
                              value: d.value ?? "",
                            }))
                            .filter((component) => {
                              const isInElse = block.else?.includes(component.value);
                              const isInConditions = block.conditions?.some(
                                (condition) => condition?.field === component.value,
                              );
                              return !isInElse && !isInConditions;
                            })}
                          value={block.then || []}
                          onValueChange={(value: string[]) => addComponent(index, "then", value)}
                          placeholder={translations("Select component")}
                          emptyIndicator="No items found."
                        />
                      </Field>
                    </Field>

                    <Field>
                      <h4 className="text-sm font-semibold">{translations("Else")}:</h4>
                      <Field>
                        <FieldLabel htmlFor={`${uid}-field-10-${index}`} className="text-xs">
                          {translations("Add Else Component")}
                        </FieldLabel>
                        <MultiSelect
                          id={`${uid}-field-10-${index}`}
                          options={componentsList
                            ?.map((d) => ({
                              label: d?.label ?? d.value ?? "",
                              value: d.value ?? "",
                            }))
                            .filter((component) => {
                              const isInThen = block.then?.includes(component.value);
                              const isInConditions = block.conditions?.some(
                                (condition) => condition?.field === component.value,
                              );
                              return !isInThen && !isInConditions;
                            })}
                          value={block.else || []}
                          onValueChange={(value: string[]) => addComponent(index, "else", value)}
                          placeholder={translations("Select component")}
                          emptyIndicator="No items found."
                        />
                      </Field>
                    </Field>
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Button variant="outline" className="w-full" onClick={() => addBlock("If")}>
          <IconPlus size={16} className="mr-2" />
          {translations("Add If Block")}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => addBlock("Switch")}>
          <IconPlus size={16} className="mr-2" />
          {translations("Add Switch Block")}
        </Button>
      </div>
    </div>
  );
};

// Export both named and default
export default ComponentLogicEditor;
