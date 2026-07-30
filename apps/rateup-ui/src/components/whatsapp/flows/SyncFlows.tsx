import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import { useId, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useImportFlowsMutation,
  useUnsyncedFlows,
  useWaFlowJson,
} from "@/backend/whatsapp/flow/flow.query";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { useListState } from "@/hooks/use-list-state.ts";
import { useDisclosure } from "@/hooks/useDisclosure";
import { WaFlowFormElementType } from "@/types/enums.ts";
import type { QuestionType, WaFlowStatus } from "@/types/enums.ts";
import type { WaFlowFormChoice, WaFlowFormElement, WaFlowWa } from "@/types/global";
import { getNestedProperty } from "@/utils/misc/obj.utils";
import {
  getQuestionResponses,
  getQuestionTypesFromFlowElement,
  qTypesWithAmbiguousChoices,
  validateOptions,
  waFlowFormToQuestionTypeMaps,
} from "@/utils/whatsapp/flow.utils";

import { TeamSelector } from "../../input/TeamSelector.tsx";
import RateupLoader from "../../Loaders/RateupLoader.tsx";
import { Field, FieldLabel, FieldTitle } from "../../ui/field.tsx";
import { Input } from "../../ui/input.tsx";
import WaTemplateStatusBadge from "./WaTemplateStatusBadge.tsx";

function SyncTemplatesModal({
  opened,
  onClose,
  unsyncedFlows,
}: {
  opened: boolean;
  onClose: () => void;
  unsyncedFlows: WaFlowWa[];
}) {
  const [selectedFlows, handlers] = useListState<string>([]);
  const [currentScreen, setCurrentScreen] = useState<"selectFlows" | "configureFlows">(
    "selectFlows",
  );

  if (!unsyncedFlows || !opened) return null;

  // Reset state when modal is closed
  function handleClose() {
    handlers.setState([]);
    setCurrentScreen("selectFlows");
    onClose();
  }

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="h-[80vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Sync Flows</DialogTitle>
        </DialogHeader>
        {currentScreen === "selectFlows" ? (
          <DisplayTemplates
            selectedTemplates={selectedFlows}
            unregisteredTemplates={unsyncedFlows}
            handlers={handlers}
            onImport={() => setCurrentScreen("configureFlows")}
          />
        ) : (
          <ImportFlows
            flows={selectedFlows
              .map((flowId: string) => unsyncedFlows.find((flow) => flow.id === flowId))
              .filter((flow) => !!flow)}
            handleClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ImportFlowsProps {
  flows: Array<WaFlowWa>;
  handleClose: () => void;
}
/**
 *  Iterates through each flow to be imported & calls ConfigureFlow for each flow.
 */
function ImportFlows({ flows, handleClose }: ImportFlowsProps) {
  const [currentFlowIndex, setCurrentFlowIndex] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState("");
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
          mapData: form.getValues("map"),
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

  const form = useForm<{ map: Record<string, any> }>({
    defaultValues: {
      map: {},
    },
  });
  const values = form.watch();

  const isOptionsValid = validateOptions({ values, path: `map.${flow.id}` });
  const isLastFlow = currentFlowIndex === flows.length - 1;

  return (
    <div className="flex flex-col">
      <Progress value={((currentFlowIndex + 1) / flows.length) * 100} />
      <ConfigureFlow flow={flow} form={form} handleNext={handleNext} key={flow.id} />
      <TeamSelector
        value={selectedTeam}
        onChange={setSelectedTeam}
        label={translations("Import Flows To")}
      />
      <div
        className="flex items-center justify-between pt-2.5"
        style={{
          position: "sticky",
          bottom: "0px",
        }}
      >
        <Button variant="outline" disabled={currentFlowIndex === 0} onClick={handlePrevious}>
          <IconChevronLeft size={20} />
          {translations("Previous")}
        </Button>
        <Button disabled={!isOptionsValid || importMutation.isPending} onClick={handleNext}>
          {isLastFlow ? translations("Import Flows") : translations("Next")}
          {!isLastFlow && <IconChevronRight size={20} />}
        </Button>
      </div>
    </div>
  );
}

// Shows a list of questions of a single flow and allows user to select which question types to import.
function ConfigureFlow({
  flow,
  form,
  handleNext,
}: {
  flow: WaFlowWa;
  form: UseFormReturn<{ map: Record<string, any> }>;
  handleNext: () => void;
}) {
  const uid = useId();
  const { data: flowJson, isLoading, error, isError } = useWaFlowJson(flow.id);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (flowJson) {
      let interactiveQCount = 0;
      for (const screen of flowJson.screens) {
        for (const screenElement of screen.layout.children) {
          if (screenElement.type === "Form") {
            for (const formElement of screenElement.children) {
              if (Object.keys(waFlowFormToQuestionTypeMaps).includes(formElement.type)) {
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
  if (!form.getValues("map")[flow.id]) setMapValue(form, flowPath, {});

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${uid}-field`}>{translations("Flow Name")}</FieldLabel>
        <Input id={`${uid}-field`} value={flow.name ?? ""} readOnly disabled />
      </Field>
      <FieldTitle>{translations("Assign valid question types")}</FieldTitle>
      <div
        className="flex flex-col rounded-lg bg-muted p-4"
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
              return child.children.map((fc: WaFlowFormElement, elementIndex: number) => {
                if (Object.keys(waFlowFormToQuestionTypeMaps).includes(fc.type)) {
                  const qTypes = getQuestionTypesFromFlowElement(fc);
                  const qPath = `${flowPath}.${fc.name}`;

                  // setting first question type as default
                  if (!getNestedProperty(form.watch(), qPath))
                    setMapValue(form, qPath, { type: qTypes[0] });

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
                    <div className="flex flex-col" key={fc.name}>
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <p>{`${screenIndex + 1}.${elementIndex + 1})`}</p>
                          <p>
                            {JSON.stringify({
                              type: fc.type,
                              label: fc.label,
                            })}
                          </p>
                        </div>
                        <Select
                          items={qTypes.map((t) => ({ label: t, value: t }))}
                          value={
                            getNestedProperty<{ type?: QuestionType }>(form.watch(), qPath)?.type ??
                            ""
                          }
                          onValueChange={(value) => {
                            setMapValue(form, qPath, {
                              type: value,
                            });
                          }}
                          disabled={qTypes.length === 1}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {qTypes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {
                        // Choice
                        choices ? (
                          <div className="flex flex-col pl-16">
                            {choices.map((choice) => {
                              const choicePath = `${qPath}.${choice.id}`;
                              let qRes: string[] = [];
                              const qType = getNestedProperty<{ type?: QuestionType }>(
                                form.watch(),
                                qPath,
                              )?.type;
                              if (qType) {
                                qRes = getQuestionResponses(qType) ?? [];
                                if (
                                  qRes?.length > 0 &&
                                  !getNestedProperty(form.watch(), choicePath)
                                )
                                  setMapValue(form, choicePath, qRes[0]);
                              }
                              return (
                                <div className="flex items-center" key={choice.id}>
                                  <p>{choice.title}</p>
                                  {qType && qTypesWithAmbiguousChoices.includes(qType) ? (
                                    <Select
                                      items={qRes.map((r) => ({ label: r, value: r }))}
                                      value={getNestedProperty(form.watch(), choicePath) ?? ""}
                                      onValueChange={(value) => {
                                        setMapValue(form, choicePath, value);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {qRes.map((r) => (
                                          <SelectItem key={r} value={r}>
                                            {r}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null
                      }
                    </div>
                  );
                }
              });
            }
          });
        })}
      </div>
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
}: {
  selectedTemplates: string[];
  unregisteredTemplates: Array<{ id: string; name?: string; status?: WaFlowStatus }>;
  handlers: {
    remove: (index: number) => void;
    setState: (ids: string[]) => void;
    append: (id: string) => void;
  };
  onImport: () => void;
}) {
  function handleSelect(selected: boolean, id: string) {
    if (selected) {
      if (!selectedTemplates.includes(id)) {
        handlers.append(id);
      }
    } else {
      if (selectedTemplates.includes(id)) {
        handlers.remove(selectedTemplates.findIndex((templateId: string) => templateId === id));
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
    <div className="flex h-[80vh] flex-col">
      <div className="relative grow overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-1 bg-background shadow-sm">
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={allChecked}
                  indeterminate={selectedTemplates.length > 0 && !allChecked}
                  onCheckedChange={(checked) => handleMasterSelect(!!checked)}
                />
              </TableHead>
              <TableHead>{translations("Template")}</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unregisteredTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedTemplates.includes(template.id)}
                    onCheckedChange={(checked) => handleSelect(!!checked, template.id)}
                  />
                </TableCell>
                <TableCell>{template.name}</TableCell>
                <TableCell>
                  <WaTemplateStatusBadge status={template.status!} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div
        className="flex items-center justify-end pt-2.5"
        style={{
          position: "sticky",
          bottom: "0px",
        }}
      >
        <Button variant="outline">{translations("Cancel")}</Button>
        <Button disabled={selectedTemplates.length === 0} onClick={onImport}>
          {translations("Import")}
        </Button>
      </div>
    </div>
  );
}

export function SyncFlowsButton({ disabled = false }) {
  const [openModal, { open, close }] = useDisclosure(false);
  const { data: unsyncedFlows, isLoading, error, isError } = useUnsyncedFlows(openModal);

  if (error) {
    toast.error("Error syncing templates");
    console.error(error);
  }
  const { t: translations } = useTranslation();
  return (
    <>
      <Button variant="outline" onClick={open} disabled={disabled}>
        <IconRefresh className={isLoading && openModal ? "animate-spin" : ""} />
        {translations("Sync")}
      </Button>
      <SyncTemplatesModal
        opened={openModal && !isLoading && !isError}
        onClose={close}
        unsyncedFlows={unsyncedFlows ?? []}
      />
    </>
  );
}

/**
 * Writes to a `map.<flowId>.<questionId>` path. These are built at runtime from flow data,
 * so they cannot be expressed as a statically-known RHF `FieldPath`.
 */
function setMapValue(
  form: UseFormReturn<{ map: Record<string, any> }>,
  path: string,
  value: unknown,
) {
  form.setValue(path as never, value as never, { shouldDirty: true });
}
