import { IconPlus, IconTrash } from "@tabler/icons-react";
import React, { useMemo } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { usePipelineQuery, usePipelinesQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { useAllSurveysSummary } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import VariableMapping from "@/components/shopify/VariableMapping.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { WaTemplateComponentTypeUpperCase } from "@/types/enums.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";

import type { ActionType, CreateRuleInput, Platform } from "./schema.ts";
import { getActionTypesForPlatform } from "./schema.ts";

// ActionValueInput now always uses shadcn Field and FieldError, and expects valueField and fieldState from Controller
const ActionValueInput = ({
  index,
  valueField,
}: {
  index: number;
  valueField: ControllerRenderProps<CreateRuleInput, `actions.${number}.value`>;
}) => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: waData } = useAllWaAutomatedReplies();
  const { data: igData } = useAllInstagramAutomations();
  const { data: labelsData } = useContactLabels();
  const { data: lifecyclesData } = useLifeCyclesQuery();
  const { data: pipelinesData = [] } = usePipelinesQuery();
  // One board per org for now, so its columns are simply the first board's.
  // `usePipelineQuery` is a no-op until that id exists.
  const { data: boardDetail } = usePipelineQuery(pipelinesData[0]?.id);
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { data: teamsData } = useTeamsByUser();
  const { data: flowsData } = useWaFlowsFromDb();
  const { data: surveysSummary } = useAllSurveysSummary();
  const { data: templatesData, isLoading: isTemplatesLoading } = useWaTemplates();

  const platform = useWatch({ control, name: "platform" }) as Platform;

  const filteredAutomations = useMemo(() => {
    if (platform === "INSTAGRAM" || platform === "FACEBOOK") {
      return [...(igData || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return [...(waData || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [waData, igData, platform]);

  const webSurveyOptions = useMemo(() => {
    if (!surveysSummary?.surveys?.length) return [];
    return surveysSummary.surveys
      ?.filter((survey) => survey?.type === "web")
      .flatMap((survey) =>
        (survey.teams || []).map((team) => ({
          value: team.mapId,
          label: `${survey.title} (${team.teamName})`,
        })),
      );
  }, [surveysSummary]);

  const actionType: ActionType = useWatch({
    control,
    name: `actions.${index}.type`,
  });

  const triggerEvent = useWatch({
    control,
    name: "triggerEvent",
  });

  const getTemplateValue = () => {
    if (typeof valueField.value === "string") {
      return {
        templateId: valueField.value,
        variableMapping: [],
        useProductImageAsHeader: false,
      };
    }
    // Two action types store an object, so the shape is narrowed by a key rather
    // than assumed from `value` not being a string.
    const stored = valueField.value && "templateId" in valueField.value ? valueField.value : null;

    return {
      templateId: stored?.templateId ?? "",
      variableMapping: stored?.variableMapping ?? [],
      useProductImageAsHeader: stored?.useProductImageAsHeader ?? false,
    };
  };

  /** Actions storing a config object read it through their own getter instead. */
  const textValue = typeof valueField.value === "string" ? valueField.value : "";

  // All fields are wrapped in Field for shadcn consistency
  if (actionType === "SEND_MESSAGE") {
    return (
      <Input
        placeholder="Message text"
        {...valueField}
        value={textValue}
        className="w-full bg-background"
      />
    );
  }
  if (actionType === "ATTACH_LABEL") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={textValue}
        items={
          labelsData?.map((l: { id: string; name: string }) => ({
            value: l?.id,
            label: l?.name,
          })) ?? []
        }
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select label" />
        </SelectTrigger>
        <SelectContent>
          {labelsData?.map((l: { id: string; name: string }) => (
            <SelectItem key={l?.id} value={l?.id}>
              {l?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "ASSIGN_USER") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={textValue}
        items={teamMembers?.data?.map((u) => ({ value: u.id, label: u.name })) ?? []}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {teamMembers?.data?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "ASSIGN_TEAM") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={textValue}
        items={teamsData?.data?.map((t) => ({ value: t.id, label: t.name })) ?? []}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          {teamsData?.data?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "SEND_FLOW") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={textValue}
        items={flowsData?.map((t) => ({ value: t.dbFlowId, label: t.name })) ?? []}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select flow" />
        </SelectTrigger>
        <SelectContent>
          {flowsData?.map((t) => (
            <SelectItem key={t.dbFlowId} value={t.dbFlowId}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "TRIGGER_CHATBOT") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={textValue}
        items={filteredAutomations?.map((t) => ({ value: t.id, label: t.name })) ?? []}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select automation" />
        </SelectTrigger>
        <SelectContent>
          {filteredAutomations?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "SEND_WEB_SURVEY") {
    return (
      <Select onValueChange={valueField.onChange} value={textValue} items={webSurveyOptions}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select web survey" />
        </SelectTrigger>
        <SelectContent>
          {webSurveyOptions.map((survey) => (
            <SelectItem key={survey.value} value={survey.value}>
              {survey.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "SEND_TEMPLATE") {
    const templateValue = getTemplateValue();

    const selectedTemplate = templatesData?.find(
      (template) => String(template.id) === templateValue.templateId,
    );
    const headerFormat = selectedTemplate?.data?.components?.find(
      (c) => c.type === WaTemplateComponentTypeUpperCase.HEADER,
    )?.format;
    const canUseProductImage = triggerEvent === "SHOPIFY_EVENT" && headerFormat === "IMAGE";

    return (
      <div className="space-y-3 w-full">
        <Select
          onValueChange={(templateId) =>
            valueField.onChange({
              ...templateValue,
              templateId,
              useProductImageAsHeader: false,
            })
          }
          value={templateValue.templateId || ""}
          disabled={isTemplatesLoading}
          items={
            templatesData?.map((template) => ({
              value: String(template.id),
              label: template?.data?.name,
            })) ?? []
          }
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue
              placeholder={isTemplatesLoading ? "Loading templates..." : "Select template"}
            />
          </SelectTrigger>
          <SelectContent>
            {templatesData?.length ? (
              templatesData.map((template) => (
                <SelectItem key={template.id} value={String(template.id)}>
                  {template?.data?.name}
                </SelectItem>
              ))
            ) : (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No templates found
              </div>
            )}
          </SelectContent>
        </Select>

        {canUseProductImage && (
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
            <Checkbox
              checked={templateValue.useProductImageAsHeader}
              onCheckedChange={(checked) =>
                valueField.onChange({
                  ...templateValue,
                  useProductImageAsHeader: checked === true,
                })
              }
              id={`use-product-image-${index}`}
            />
            <div>
              <FieldLabel
                htmlFor={`use-product-image-${index}`}
                className="cursor-pointer font-medium"
              >
                Use Shopify product image as header
              </FieldLabel>
              <p className="text-xs text-muted-foreground mt-0.5">
                Replaces the template's default header image with the product image from the
                triggering Shopify order.
              </p>
            </div>
          </div>
        )}

        {templateValue.templateId && (
          <VariableMapping
            waTemplateId={templateValue.templateId}
            value={templateValue.variableMapping}
            onChange={(variableMapping) =>
              valueField.onChange({
                ...templateValue,
                variableMapping,
              })
            }
            triggerEvent={triggerEvent}
          />
        )}
      </div>
    );
  }
  if (actionType === "CALL_EXTERNAL_API") {
    return (
      <Input
        type="url"
        placeholder="https://example.com/test"
        {...valueField}
        value={textValue}
        className="w-full bg-background"
      />
    );
  }
  if (actionType === "ASSIGN_LIFECYCLE") {
    // Rules saved before the pipeline option existed hold a bare lifecycle id.
    const stored =
      valueField.value && typeof valueField.value !== "string" && "lifecycleId" in valueField.value
        ? valueField.value
        : null;
    const lifecycleValue: { lifecycleId: string; pipelineId?: string } = stored ?? {
      lifecycleId: typeof valueField.value === "string" ? valueField.value : "",
    };
    const addsLead = Boolean(lifecycleValue.pipelineId);

    const noPipelines = pipelinesData.length === 0;

    return (
      <div className="flex w-full flex-col gap-2">
        {/* The two pickers share a line: they are one sentence — this lifecycle,
            that board — and stacking them made the row twice as tall as its
            neighbours for what is still a single action. */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            onValueChange={(value) =>
              valueField.onChange({ ...lifecycleValue, lifecycleId: value ?? "" })
            }
            value={lifecycleValue.lifecycleId}
            items={lifecyclesData?.map((t) => ({ value: t.id, label: t.name })) ?? []}
          >
            <SelectTrigger className="bg-background min-w-36 flex-1">
              <SelectValue placeholder="Select lifecycle" />
            </SelectTrigger>
            <SelectContent>
              {lifecyclesData?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {addsLead && (
            <Select
              onValueChange={(value) =>
                valueField.onChange({ ...lifecycleValue, pipelineId: value ?? undefined })
              }
              value={lifecycleValue.pipelineId ?? ""}
              items={pipelinesData.map((p) => ({ value: p.id, label: p.name }))}
            >
              <SelectTrigger
                className="bg-background min-w-36 flex-1"
                aria-label="Pipeline to add the lead to"
              >
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelinesData.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Opting in is what names the board, so the switch and the picker are one
            control: turning it off drops the pipeline rather than remembering it. */}
        <div className="flex items-center gap-2">
          <Switch
            id={`action-${index}-add-lead`}
            checked={addsLead}
            disabled={noPipelines}
            onCheckedChange={(checked) =>
              valueField.onChange({
                ...lifecycleValue,
                pipelineId: checked ? pipelinesData[0]?.id : undefined,
              })
            }
          />
          <Label
            htmlFor={`action-${index}-add-lead`}
            className="text-muted-foreground cursor-pointer text-[11px] font-medium"
          >
            {noPipelines ? (
              "Add a lead — no pipelines yet"
            ) : (
              <>
                Also add a lead
                {addsLead && (
                  <span className="hidden sm:inline"> · skips contacts already on that board</span>
                )}
              </>
            )}
          </Label>
        </div>
      </div>
    );
  }
  if (actionType === "ASSIGN_STAGE") {
    // The picker saves a bare stage id — one board per org, so nothing else needs
    // storing. Converted rules arrive as an object instead, keeping the lifecycle
    // they came from so the change can be traced; both shapes are read here, the
    // same way `readAssignStageValue` does on the API.
    const stageId =
      typeof valueField.value === "string"
        ? valueField.value
        : ((valueField.value as { stageId?: string } | undefined)?.stageId ?? "");
    const stages = boardDetail?.stages ?? [];

    if (!stages.length) {
      return (
        <p className="text-muted-foreground w-full text-[11px]">
          No pipeline columns yet — create a pipeline before using this action.
        </p>
      );
    }

    return (
      <Select
        onValueChange={(value) => valueField.onChange(value ?? "")}
        value={stageId}
        items={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
      >
        <SelectTrigger className="bg-background w-full">
          <SelectValue placeholder="Select stage" />
        </SelectTrigger>
        <SelectContent>
          {stages.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {/* Won and Lost close the lead, so the status is worth showing —
                  picking one here is a decision, not just a move. */}
              {stage.name}
              {stage.status !== "OPEN" && (
                <span className="text-muted-foreground ml-1.5 text-[11px]">
                  {stage.status === "WON" ? "· closes as won" : "· closes as lost"}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "CLOSE_TICKET") {
    const statusOptions = [
      { value: WaMessageAssignStatus.RESOLVED, label: "Resolved" },
      { value: WaMessageAssignStatus.CLOSED, label: "Closed" },
      { value: WaMessageAssignStatus.SPAM, label: "Spam" },
      { value: WaMessageAssignStatus.UNRESOLVED, label: "Unresolved" },
    ];
    return (
      <Select onValueChange={valueField.onChange} value={textValue} items={statusOptions}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select close status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  // Default fallback
  return <Input placeholder="Value" {...valueField} value={textValue} />;
};
const ExternalApiExample = () => {
  const { control } = useFormContext<CreateRuleInput>();
  const actions = useWatch({
    control,
    name: "actions",
  });

  return (
    actions?.some((data) => data.type === "CALL_EXTERNAL_API") && (
      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border mt-1">
        <strong>Example API request:</strong>
        <pre className="whitespace-pre-wrap mt-1">
          {`POST {url}
Content-Type: application/json

{
  "user": "1234567890",
  "action": "Approve"
}`}
        </pre>
      </div>
    )
  );
};

const ActionList: React.FC = () => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CreateRuleInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "actions",
  });
  const platform = useWatch({ control, name: "platform" }) as Platform;

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="text-muted-foreground text-sm italic p-4 text-center bg-muted/50 rounded-lg border border-dashed">
          No actions added.
        </div>
      )}
      <ExternalApiExample />
      {fields.map((field, index) => (
        <div
          key={field.id}
          // Top-aligned, not centred: an action whose value needs more than one
          // control (a template's variable mapping, a lifecycle plus its board)
          // otherwise leaves the type select floating in the middle of the row.
          // Single-control rows are unaffected — they are one line tall either way.
          className="flex gap-3 items-start p-4 bg-white dark:bg-card rounded-lg border border-border"
        >
          <Controller
            control={control}
            name={`actions.${index}.type`}
            render={({ field, fieldState }) => {
              // Computed per row, not once for the list: the legacy Assign
              // Lifecycle entry is offered only to the action already using it.
              const filteredActionTypes = getActionTypesForPlatform(
                platform ?? "WHATSAPP",
                typeof field.value === "string" ? field.value : undefined,
              );

              return (
                <Field className="flex-1" data-invalid={fieldState.invalid}>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (val === "SEND_TEMPLATE") {
                        setValue(`actions.${index}.value`, {
                          templateId: "",
                          variableMapping: [],
                        });
                        return;
                      }
                      setValue(`actions.${index}.value`, "");
                    }}
                    defaultValue={field.value}
                    value={field.value}
                    items={filteredActionTypes}
                  >
                    <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Action Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredActionTypes.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />

          <Controller
            control={control}
            name={`actions.${index}.value`}
            render={({ field: valueField, fieldState }) => (
              <Field className="flex-1" data-invalid={fieldState.invalid}>
                <ActionValueInput index={index} valueField={valueField} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button
            aria-label="Delete Action"
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            title="Delete Action"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10"
          >
            <IconTrash className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30"
        onClick={() => append({ type: "TRIGGER_CHATBOT", value: "" })}
      >
        <IconPlus className="w-4 h-4 mr-2" /> Add action
      </Button>

      {errors.actions?.root?.message && (
        <p className="text-sm font-medium text-destructive mt-2">{errors.actions?.root?.message}</p>
      )}
    </div>
  );
};

export default ActionList;
