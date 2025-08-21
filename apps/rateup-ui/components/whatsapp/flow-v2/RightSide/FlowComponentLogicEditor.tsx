import React, { useEffect, useMemo } from "react";

import {
  Accordion,
  ActionIcon,
  Button,
  Divider,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { getResponses2 } from "@/utils/survey/logic/logic.utils";

import useFlowStore from "../utils/store";

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

export const FlowLogicComponentEditor = ({ blocks, setBlocks }) => {
  const { getCurrentScreen, currentScreenId } = useFlowStore();
  const translations = useTranslations();

  const filteredQuestions = getCurrentScreen().layout.children.filter(
    ({ label, type }) => label && type !== "Footer",
  );
  const questions = filteredQuestions.map((comp) => ({
    label: comp.label,
    value: comp.id,
  }));
  const componentsList = getCurrentScreen()
    .layout.children.filter(({ label, type }) => type !== "Footer")
    .map((comp) => ({ label: comp.label || comp.text, value: comp.id }));

  const getOperators = useMemo(() => {
    return (field) => {
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

  const handleSubmit = (values) => {
    // Save values after validation is successful
    console.log("Validated values:", values);
  };

  const addBlock = (type) => {
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

  const updateCondition = (blockIndex, conditionIndex, field, value) => {
    const updatedBlocks = [...blocks];
    if (field === "field") {
      updatedBlocks[blockIndex].conditions[conditionIndex].operator = null;
      updatedBlocks[blockIndex].conditions[conditionIndex].value = null;
    }
    updatedBlocks[blockIndex].conditions[conditionIndex][field] = value;
    if (!isNaN(value)) {
      updatedBlocks[blockIndex].conditions[conditionIndex].isNumber = true;
    }
    updatedBlocks[blockIndex].conditions[conditionIndex][field] = value;

    setBlocks(updatedBlocks);
  };

  const updateSwitchValue = (blockIndex, value) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].value = value;
    setBlocks(updatedBlocks);
  };

  const updateSwitchCase = (blockIndex, caseKey, components) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].cases[caseKey] = components.map((type) => ({
      type,
      content: "",
    }));
    setBlocks(updatedBlocks);
  };

  const addSwitchCase = (blockIndex, caseKey) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].cases[caseKey] = [];
    setBlocks(updatedBlocks);
  };

  const updateSwitchCaseComponents = (blockIndex, caseKey, components) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].cases[caseKey] = components.map((type) => ({
      type,
      content: "",
    }));
    setBlocks(updatedBlocks);
  };

  const updateSwitchCaseKey = (blockIndex, oldKey, newKey) => {
    const updatedBlocks = [...blocks];
    const components = updatedBlocks[blockIndex].cases[oldKey];
    delete updatedBlocks[blockIndex].cases[oldKey];
    updatedBlocks[blockIndex].cases[newKey] = components;
    setBlocks(updatedBlocks);
  };

  const removeSwitchCase = (blockIndex, caseKey) => {
    const updatedBlocks = [...blocks];
    delete updatedBlocks[blockIndex].cases[caseKey];
    setBlocks(updatedBlocks);
  };

  const addCondition = (blockIndex) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].conditions.push({
      field: "",
      operator: "",
      value: "",
      logic: "&&",
    });
    setBlocks(updatedBlocks);
  };

  const removeCondition = (blockIndex, conditionIndex) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].conditions = updatedBlocks[
      blockIndex
    ].conditions.filter((_, i) => i !== conditionIndex);
    setBlocks(updatedBlocks);
  };

  const addComponent = (blockIndex, key, componentTypes) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex][key] = componentTypes;
    setBlocks(updatedBlocks);
  };

  const ensurePredefinedCases = (blockIndex) => {
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
    <Stack
      gap={"xs"}
      style={{
        flex: 1,
        borderRadius: "12px",
      }}
      my="xs"
      py="xs"
    >
      <Text>Component Jump</Text>

      <Accordion>
        {blocks.map((block, index) => (
          <Accordion.Item value={`block-${index}`} key={index}>
            <Accordion.Control>
              <Group justify="space-between">
                {block.type} Block {index + 1}
                <ActionIcon
                  color="red"
                  onClick={() =>
                    setBlocks(blocks.filter((_, i) => i !== index))
                  }
                  ml="auto"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                {block.type === "If" && (
                  <>
                    <h5>Conditions:</h5>
                    {block.conditions.map((condition, condIndex) => {
                      let q = filteredQuestions.find(
                        (qs) => qs.id === condition.field,
                      );
                      let operatorData = q && getResponses2(q);
                      return (
                        <Group key={condIndex} grow>
                          <Select
                            label="Question"
                            data={questions}
                            value={condition.field}
                            onChange={(value) => {
                              updateCondition(index, condIndex, "field", value);
                            }}
                          />
                          <Select
                            label="Operator"
                            data={getOperators(condition.field)}
                            value={condition.operator}
                            onChange={(value) => {
                              updateCondition(
                                index,
                                condIndex,
                                "operator",
                                value,
                              );
                            }}
                          />
                          {operatorData ? (
                            <Select
                              label="Value"
                              data={operatorData}
                              value={condition.value}
                              onChange={(value) => {
                                updateCondition(
                                  index,
                                  condIndex,
                                  "value",
                                  value,
                                );
                              }}
                            />
                          ) : (
                            <TextInput
                              label="Value"
                              placeholder="Enter value"
                              value={condition.value}
                              type={q?.["input-type"] || "text"}
                              onChange={(e) => {
                                let value =
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
                          )}
                          {condIndex > 0 && (
                            <Select
                              label="Logic"
                              data={logicalOperators}
                              value={condition.logic}
                              onChange={(value) => {
                                updateCondition(
                                  index,
                                  condIndex,
                                  "logic",
                                  value,
                                );
                              }}
                            />
                          )}
                          <ActionIcon
                            color="red"
                            onClick={() => removeCondition(index, condIndex)}
                            mt={"lg"}
                            disabled={condIndex === 0}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      );
                    })}
                    <Button
                      variant="subtle"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => addCondition(index)}
                    >
                      Add Condition
                    </Button>
                  </>
                )}

                {block.type === "Switch" && (
                  <>
                    <Select
                      label="Question"
                      data={questions}
                      value={block.value}
                      onChange={(value) => updateSwitchValue(index, value)}
                    />
                    {Object.keys(block.cases).map((caseKey, caseIndex) => (
                      <Stack key={caseIndex}>
                        {caseKey !== "default" ? (
                          <>
                            <Group>
                              <TextInput
                                label={`Case ${caseKey}`}
                                placeholder="Enter case key"
                                value={caseKey}
                                onChange={(e) =>
                                  updateSwitchCaseKey(
                                    index,
                                    caseKey,
                                    e.target.value,
                                  )
                                }
                              />
                              {caseIndex > 2 && (
                                <ActionIcon
                                  color="red"
                                  onClick={() =>
                                    removeSwitchCase(index, caseKey)
                                  }
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </>
                        ) : (
                          <Text>{`Case ${caseKey}`}</Text>
                        )}
                        <MultiSelect
                          label="Add Components"
                          placeholder="Select component"
                          data={componentsList}
                          value={block.cases[caseKey].map((comp) => comp.type)}
                          onChange={(value) =>
                            updateSwitchCaseComponents(index, caseKey, value)
                          }
                        />
                      </Stack>
                    ))}
                    <Button
                      variant="subtle"
                      leftSection={<IconPlus size={14} />}
                      onClick={() =>
                        addSwitchCase(
                          index,
                          `Case ${Object.keys(block.cases).length}`,
                        )
                      }
                    >
                      Add new Case
                    </Button>
                  </>
                )}
              </Stack>

              {block.type === "If" && (
                <>
                  <Divider my="sm" />
                  <Group grow>
                    <Stack>
                      <h5>Then:</h5>
                      <MultiSelect
                        label="Add Then Component"
                        placeholder="Select component"
                        data={componentsList
                          ?.map((d) => ({
                            label: d.label ?? d.value,
                            value: d.value,
                          }))
                          .filter((component) => {
                            const isInElse = block.else?.includes(
                              component.value,
                            );
                            const isInConditions = block.conditions?.some(
                              (condition) =>
                                condition?.field === component.value,
                            );
                            return !isInElse && !isInConditions;
                          })}
                        value={block.then}
                        onChange={(value) => addComponent(index, "then", value)}
                      />
                    </Stack>

                    <Stack>
                      <h5>Else:</h5>
                      <MultiSelect
                        label="Add Else Component"
                        placeholder="Select component"
                        data={componentsList
                          ?.map((d) => ({
                            label: d?.label ?? d.value,
                            value: d.value,
                          }))
                          .filter((component) => {
                            const isInElse = block.then?.includes(
                              component.value,
                            );
                            const isInConditions = block.conditions?.some(
                              (condition) =>
                                condition?.field === component.value,
                            );
                            return !isInElse && !isInConditions;
                          })}
                        value={block.else}
                        onChange={(value) => addComponent(index, "else", value)}
                      />
                    </Stack>
                  </Group>
                </>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Button
        variant="outline"
        leftSection={<IconPlus />}
        fullWidth
        onClick={() => addBlock("If")}
        style={{
          flexShrink: 0,
        }}
      >
        {translations("Add Logic Jump")}
      </Button>
    </Stack>
  );
};
