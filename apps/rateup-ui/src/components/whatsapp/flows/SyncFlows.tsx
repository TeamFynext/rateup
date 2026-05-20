"use client";

import { useEffect, useState } from "react";

import {
  Button,
  Checkbox,
  Flex,
  Group,
  InputLabel,
  Modal,
  Progress,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useForm } from "@mantine/form";
import { useDisclosure, useListState } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { WaFlowFormElementType } from "@/types/enums.ts";
import type {
  WaFlowFormChoice,
  WaFlowFormElement,
  WaFlowWa,
} from "@/types/global";
import {
  useImportFlowsMutation,
  useUnsyncedFlows,
  useWaFlowJson,
} from "@/backend/whatsapp/flow/flow.query";
import { getNestedProperty } from "@/utils/misc/obj.utils";
import {
  getQuestionResponses,
  getQuestionTypesFromFlowElement,
  qTypesWithAmbiguousChoices,
  validateOptions,
  waFlowFormToQuestionTypeMaps,
} from "@/utils/whatsapp/flow.utils";

import { ContainedTextField } from "../../input/ContainedInput/ContainedInput.tsx";
import { TeamSelector } from "../../input/TeamSelector.tsx";
import RateupLoader from "../../Loaders/RateupLoader.tsx";
import classes from "../templates/template.module.css";
import WaTemplateStatusBadge from "./WaTemplateStatusBadge.tsx";

export function SyncTemplatesModal({ opened, onClose, unsyncedFlows }) {
  const [selectedFlows, handlers] = useListState([]);
  const [currentScreen, setCurrentScreen] = useState<
    "selectFlows" | "configureFlows"
  >("selectFlows");

  if (!unsyncedFlows || !opened) return null;

  // Reset state when modal is closed
  function handleClose() {
    handlers.setState([]);
    setCurrentScreen("selectFlows");
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Sync Flows"
      h="80vh"
      size={"xl"}
      closeOnClickOutside={false}
    >
      {currentScreen === "selectFlows" ? (
        <DisplayTemplates
          selectedTemplates={selectedFlows}
          unregisteredTemplates={unsyncedFlows}
          handlers={handlers}
          onImport={() => setCurrentScreen("configureFlows")}
        />
      ) : (
        <ImportFlows
          flows={selectedFlows.map((flowId) =>
            unsyncedFlows.find((flow) => flow.id === flowId),
          )}
          handleClose={handleClose}
        />
      )}
    </Modal>
  );
}

interface ImportFlowsProps {
  flows: Array<WaFlowWa>;
  handleClose: () => void;
}
/**
 *  Iterates through each flow to be imported & calls ConfigureFlow for each flow.
 */
export function ImportFlows({ flows, handleClose }: ImportFlowsProps) {
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const flow = flows[currentFlowIndex];
  const importMutation = useImportFlowsMutation();
  const { t: translations } = useTranslation();
  function handleNext() {
    if (currentFlowIndex !== flows.length - 1) {
      setCurrentFlowIndex(currentFlowIndex + 1);
    } else {
      // import flows
      importMutation.mutate(
        {
          waFlowIds: flows.map((flow) => flow.id),
          teamIds: [selectedTeam], // TODO: allow user to select multiple teams?
          mapData: form.values.map,
        },
        {
          onSuccess: () => {
            handleClose();
          },
        },
      );
    }
  }
  function handlePrevious() {
    if (currentFlowIndex !== 0) {
      setCurrentFlowIndex(currentFlowIndex - 1);
    }
  }

  const form = useForm({
    initialValues: {
      map: {},
    },
  });

  const isOptionsValid = validateOptions({ form, path: `map.${flow.id}` });
  const isLastFlow = currentFlowIndex === flows.length - 1;

  return (
    <Stack mah={"80vh"}>
      <Progress value={((currentFlowIndex + 1) / flows.length) * 100} />
      <ConfigureFlow
        flow={flow}
        form={form}
        handleNext={handleNext}
        key={flow.id}
      />
      <TeamSelector
        value={selectedTeam}
        onChange={setSelectedTeam}
        label={translations("Import Flows To")}
      />
      <Group
        justify="space-between"
        style={{
          position: "sticky",
          bottom: "0px",
        }}
        pt="xs"
      >
        <Button
          variant="outline"
          leftSection={<IconChevronLeft size={20} />}
          disabled={currentFlowIndex === 0}
          onClick={handlePrevious}
        >
          {translations("Previous")}
        </Button>
        <Button
          rightSection={isLastFlow ? undefined : <IconChevronRight size={20} />}
          disabled={!isOptionsValid}
          onClick={handleNext}
          loading={importMutation.isPending}
        >
          {isLastFlow ? translations("Import Flows") : translations("Next")}
        </Button>
      </Group>
    </Stack>
  );
}

// Shows a list of questions of a single flow and allows user to select which question types to import.
function ConfigureFlow({
  flow,
  form,
  handleNext,
}: {
  flow: WaFlowWa;
  form: UseFormReturnType<any>;
  handleNext: () => void;
}) {
  const { data: flowJson, isLoading, error, isError } = useWaFlowJson(flow.id);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (flowJson) {
      let interactiveQCount = 0;
      for (const screen of flowJson.screens) {
        for (const screenElement of screen.layout.children) {
          if (screenElement.type === "Form") {
            for (const formElement of screenElement.children) {
              if (
                Object.keys(waFlowFormToQuestionTypeMaps).includes(
                  formElement.type,
                )
              ) {
                interactiveQCount++;
              }
            }
          }
        }
      }

      if (interactiveQCount === 0) {
        handleNext();
      }
    }
  }, [flowJson]);

  if (isError) {
    toast.error("Error loading flow");
    console.error(error);
  }
  if (isLoading || !flowJson) return <RateupLoader />;

  const flowPath = `map.${flow.id}`;
  if (!form.values.map[flow.id]) form.setFieldValue(flowPath, {});

  return (
    <>
      <ContainedTextField
        label={translations("Flow Name")}
        value={flow.name}
        disabled
      />
      <InputLabel>{translations("Assign valid question types")}</InputLabel>
      <Stack
        bg="whitesmoke"
        p="md"
        style={{
          borderRadius: "8px",
          height: "100%",
          overflowY: "auto",
          maxHeight: "60vh", // TODO: make this responsive
        }}
      >
        {/* SCREENS */}
        {flowJson.screens.map((screen, screenIndex) => {
          return screen.layout.children.map((child) => {
            if (child.type === "Form") {
              {
                /* Form Element */
              }
              return child.children.map(
                (fc: WaFlowFormElement, elementIndex: number) => {
                  if (
                    Object.keys(waFlowFormToQuestionTypeMaps).includes(fc.type)
                  ) {
                    const qTypes = getQuestionTypesFromFlowElement(fc);
                    const qPath = `${flowPath}.${fc.name}`;

                    // setting first question type as default
                    if (!form.isTouched(qPath))
                      form.setFieldValue(qPath, { type: qTypes[0] });

                    // For opt in checkboxes we need to show which of the options go with 'checked' and 'unchecked' state
                    const choices =
                      fc.type === WaFlowFormElementType.optIn
                        ? [
                            {
                              id: "true",
                              title: "true",
                            },
                            {
                              id: "false",
                              title: "false",
                            },
                          ]
                        : (fc["data-source"] as Array<WaFlowFormChoice>);

                    return (
                      <Stack key={fc.name}>
                        <Group>
                          <Group>
                            <Text>
                              {`${screenIndex + 1}.${elementIndex + 1})`}
                            </Text>
                            <Text>
                              {JSON.stringify({
                                type: fc.type,
                                label: fc.label,
                              })}
                            </Text>
                          </Group>
                          <Select
                            data={qTypes}
                            clearable={false}
                            value={getNestedProperty(form.values, qPath)?.type}
                            onChange={(value) => {
                              form.setFieldValue(qPath, {
                                type: value,
                              });
                            }}
                            disabled={qTypes.length === 1}
                          />
                        </Group>

                        {
                          // Choice
                          choices ? (
                            <Stack pl="64px">
                              {choices.map((choice) => {
                                const choicePath = `${qPath}.${choice.id}`;
                                let qRes = [];
                                const qType = getNestedProperty(
                                  form.values,
                                  qPath,
                                )?.type;
                                if (qType) {
                                  qRes = getQuestionResponses(qType);
                                  if (
                                    qRes?.length > 0 &&
                                    !getNestedProperty(form.values, choicePath)
                                  )
                                    form.setFieldValue(choicePath, qRes[0]);
                                }
                                return (
                                  <Group key={choice.id}>
                                    <Text>{choice.title}</Text>
                                    {qTypesWithAmbiguousChoices.includes(
                                      qType,
                                    ) ? (
                                      <Select
                                        clearable={false}
                                        data={qRes}
                                        value={getNestedProperty(
                                          form.values,
                                          choicePath,
                                        )}
                                        onChange={(value) => {
                                          form.setFieldValue(choicePath, value);
                                        }}
                                      />
                                    ) : null}
                                  </Group>
                                );
                              })}
                            </Stack>
                          ) : null
                        }
                      </Stack>
                    );
                  }
                },
              );
            }
          });
        })}
      </Stack>
    </>
  );
}

/**
 * Displays list of templates in which user can select which templates to import.
 * @param param0
 * @returns
 */
function DisplayTemplates({
  selectedTemplates,
  unregisteredTemplates,
  handlers,
  onImport,
}) {
  function handleSelect(selected: boolean, id: string) {
    if (selected) {
      if (!selectedTemplates.includes(id)) {
        handlers.append(id);
      }
    } else {
      if (selectedTemplates.includes(id)) {
        handlers.remove(
          selectedTemplates.findIndex((templateId) => templateId === id),
        );
      }
    }
  }
  function handleMasterSelect(selected: boolean) {
    if (selected) {
      handlers.setState(unregisteredTemplates.map((template) => template.id));
    } else {
      handlers.setState([]);
    }
  }
  const allChecked = selectedTemplates.length === unregisteredTemplates?.length;
  const { t: translations } = useTranslation();
  return (
    <Flex direction={"column"} h="80vh">
      <Table.ScrollContainer
        minWidth={"100%"}
        style={{
          position: "relative",
          flexGrow: 1,
        }}
      >
        <Table>
          <Table.Thead
            style={{
              position: "sticky",
              top: "0px",
              backgroundColor: "white",
              zIndex: 1,
              boxShadow: "0px 0px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Table.Tr>
              <Table.Th>
                <Checkbox
                  checked={allChecked}
                  indeterminate={selectedTemplates.length > 0 && !allChecked}
                  onChange={(event) =>
                    handleMasterSelect(event.currentTarget.checked)
                  }
                />
              </Table.Th>
              <Table.Th>{translations("Template")}</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody w="100%">
            {unregisteredTemplates.map((template) => (
              <Table.Tr key={template.id}>
                <Table.Td>
                  <Checkbox
                    checked={selectedTemplates.includes(template.id)}
                    onChange={(event) =>
                      handleSelect(event.currentTarget.checked, template.id)
                    }
                  />
                </Table.Td>
                <Table.Td>{template.name}</Table.Td>
                <Table.Td>
                  <WaTemplateStatusBadge status={template.status} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group
        justify="end"
        style={{
          position: "sticky",
          bottom: "0px",
        }}
        pt="xs"
      >
        <Button variant="outline">{translations("Cancel")}</Button>
        <Button disabled={selectedTemplates.length === 0} onClick={onImport}>
          {translations("Import")}
        </Button>
      </Group>
    </Flex>
  );
}

export function SyncFlowsButton({ disabled = false }) {
  const [openModal, { open, close }] = useDisclosure(false);
  const {
    data: unsyncedFlows,
    isLoading,
    error,
    isError,
  } = useUnsyncedFlows(openModal);

  if (error) {
    toast.error("Error syncing templates");
    console.error(error);
  }
  const { t: translations } = useTranslation();
  return (
    <>
      <Button
        leftSection={
          <IconRefresh
            className={isLoading && openModal ? classes.rotateInfinitely : ""}
          />
        }
        variant="outline"
        onClick={open}
        radius={"lg"}
        disabled={disabled}
      >
        {translations("Sync")}
      </Button>
      <SyncTemplatesModal
        opened={openModal && !isLoading && !isError}
        onClose={close}
        unsyncedFlows={unsyncedFlows}
      />
    </>
  );
}
