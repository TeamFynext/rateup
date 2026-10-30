import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  IconChevronDown,
  IconCircleCheck,
  IconClipboardList,
  IconGripVertical,
  IconInfoCircle,
  IconLayoutKanban,
  IconMessage,
  IconPlus,
  IconRefresh,
  IconMessageChatbot,
  IconShoppingBag,
  IconSitemap,
  IconTag,
  IconTemplate,
  IconTrash,
  IconUser,
  IconUsersGroup,
  IconWebhook,
} from "@tabler/icons-react";
import React, { Fragment, useMemo, useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { useChatbots } from "@/backend/chatbots/chatbots.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { usePipelineQuery, usePipelinesQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { useAllSurveysSummary } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { MessageBodyEditor } from "@/components/dashboard/loyalty/messages/MessageBodyEditor.tsx";
import { findLeadsPipeline } from "@/components/pipeline/pipelineTypes.ts";
import VariableMapping from "@/components/shopify/VariableMapping.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
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
import { cn } from "@/lib/utils.ts";
import { WaTemplateComponentTypeUpperCase } from "@/types/enums.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";

import type { ActionType, CreateRuleInput, Platform } from "./schema.ts";
import { asPlatform, getActionTypesForPlatforms } from "./schema.ts";
import { ShopProductsActionInput } from "./ShopProductsAction.tsx";

// ActionValueInput now always uses shadcn Field and FieldError, and expects valueField and fieldState from Controller
const ActionValueInput = ({
  index,
  valueField,
}: {
  index: number;
  valueField: ControllerRenderProps<CreateRuleInput, `actions.${number}.value`>;
}) => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: chatbots } = useChatbots();
  const { data: labelsData } = useContactLabels();
  const { data: lifecyclesData } = useLifeCyclesQuery();
  const { data: pipelinesData = [] } = usePipelinesQuery();
  // Rules move a contact on the Leads board, the only one the server resolves them on.
  // `usePipelineQuery` is a no-op until that id exists.
  const { data: boardDetail } = usePipelineQuery(findLeadsPipeline(pipelinesData)?.id);
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { data: teamsData } = useTeamsByUser();
  const { data: flowsData } = useWaFlowsFromDb();
  const { data: surveysSummary } = useAllSurveysSummary();
  const { data: templatesData, isLoading: isTemplatesLoading } = useWaTemplates();

  const platform = useWatch({ control, name: "platform" }) as Platform;
  const platforms = useWatch({ control, name: "platforms" }) ?? [];

  // A rule can only start a chatbot on its own platform; the API refuses any other.
  const filteredAutomations = useMemo(() => {
    const channel = platform?.toLowerCase();
    return (chatbots?.data ?? [])
      .filter((chatbot) => chatbot.platform === channel)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [chatbots, platform]);

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
        buttonUrlVariable: undefined,
      };
    }
    // Two action types store an object, so the shape is narrowed by a key rather
    // than assumed from `value` not being a string.
    const stored = valueField.value && "templateId" in valueField.value ? valueField.value : null;

    return {
      templateId: stored?.templateId ?? "",
      variableMapping: stored?.variableMapping ?? [],
      useProductImageAsHeader: stored?.useProductImageAsHeader ?? false,
      buttonUrlVariable: stored?.buttonUrlVariable,
    };
  };

  /** Actions storing a config object read it through their own getter instead. */
  const textValue = typeof valueField.value === "string" ? valueField.value : "";

  // All fields are wrapped in Field for shadcn consistency
  if (actionType === "SEND_MESSAGE") {
    const onWhatsApp = platforms.includes("WHATSAPP");
    return (
      <div className="flex w-full flex-col gap-1.5">
        <MessageBodyEditor
          id={`action-${index}-message`}
          name={valueField.name}
          value={textValue}
          onChange={valueField.onChange}
          onBlur={valueField.onBlur}
          rows={4}
          placeholder="Write the reply your customer will get"
          formatting={onWhatsApp}
          formattingHint
        />
        {onWhatsApp && platforms.length > 1 && (
          <p className="text-muted-foreground text-xs">
            Bold, italic and other formatting show on WhatsApp. Instagram and Messenger get the same
            words as plain text.
          </p>
        )}
      </div>
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
    // WooCommerce orders carry each line item's image; Shopify's is looked up by product.
    const canUseProductImage =
      (triggerEvent === "SHOPIFY_EVENT" || triggerEvent === "WOOCOMMERCE_EVENT") &&
      headerFormat === "IMAGE";

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
            buttonValue={templateValue.buttonUrlVariable}
            onButtonChange={(buttonUrlVariable) =>
              valueField.onChange({ ...templateValue, buttonUrlVariable })
            }
            triggerEvent={triggerEvent}
          />
        )}
      </div>
    );
  }
  if (actionType === "SEND_SHOP_PRODUCTS") {
    return (
      <ShopProductsActionInput
        value={valueField.value}
        onChange={valueField.onChange}
        onInstagram={platforms.includes("INSTAGRAM")}
      />
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
      <Alert>
        <IconInfoCircle />
        <AlertTitle>Example API request</AlertTitle>
        <AlertDescription>
          <pre className="mt-1 text-xs whitespace-pre-wrap">
            {`POST {url}
Content-Type: application/json

{
  "user": "1234567890",
  "action": "Approve"
}`}
          </pre>
        </AlertDescription>
      </Alert>
    )
  );
};

/** How each action reads in the "Add action" menu, and the icon its card carries. */
const ACTION_META: Record<string, { icon: typeof IconMessage; label: string }> = {
  SEND_MESSAGE: { icon: IconMessage, label: "Send a message" },
  SEND_TEMPLATE: { icon: IconTemplate, label: "Send a template" },
  SEND_FLOW: { icon: IconSitemap, label: "Send a flow" },
  SEND_WEB_SURVEY: { icon: IconClipboardList, label: "Send a web survey" },
  TRIGGER_CHATBOT: { icon: IconMessageChatbot, label: "Start a chatbot" },
  ASSIGN_TEAM: { icon: IconUsersGroup, label: "Assign to a team" },
  ASSIGN_USER: { icon: IconUser, label: "Assign to a teammate" },
  ATTACH_LABEL: { icon: IconTag, label: "Add a label" },
  ASSIGN_STAGE: { icon: IconLayoutKanban, label: "Move to a lead stage" },
  ASSIGN_LIFECYCLE: { icon: IconRefresh, label: "Set lifecycle (legacy)" },
  CLOSE_TICKET: { icon: IconCircleCheck, label: "Close the chat" },
  CALL_EXTERNAL_API: { icon: IconWebhook, label: "Call an external API" },
  SEND_SHOP_PRODUCTS: { icon: IconShoppingBag, label: "Send products to buy" },
};

const ACTION_GROUPS: readonly { label: string; types: readonly string[] }[] = [
  {
    label: "Reply to the customer",
    types: [
      "SEND_MESSAGE",
      "SEND_SHOP_PRODUCTS",
      "SEND_TEMPLATE",
      "SEND_FLOW",
      "SEND_WEB_SURVEY",
      "TRIGGER_CHATBOT",
    ],
  },
  {
    label: "Behind the scenes",
    types: [
      "ASSIGN_TEAM",
      "ASSIGN_USER",
      "ATTACH_LABEL",
      "ASSIGN_STAGE",
      "CLOSE_TICKET",
      "CALL_EXTERNAL_API",
    ],
  },
];

const LAST = "last";

/**
 * The rule's actions as cards in run order: one open for editing, the rest folded to a line that
 * says what they will do. `describe` turns an action into that line; it comes from the rule
 * sentence, so the cards and the sentence never word an action differently.
 */
const ActionList: React.FC<{
  describe: (index: number) => { text: string; complete: boolean };
}> = ({ describe }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateRuleInput>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "actions",
  });
  const platforms = (useWatch({ control, name: "platforms" }) ?? []).map(asPlatform);
  const actions = useWatch({ control, name: "actions" });
  const available = getActionTypesForPlatforms(platforms);
  const menuGroups = ACTION_GROUPS.map((group) => ({
    label: group.label,
    items: available.filter((option) => group.types.includes(option.value)),
  })).filter((group) => group.items.length > 0);
  // The first unfinished action is the one worth opening; a template leaves several unfinished.
  // "last" opens whichever row was just appended, whose id only exists once it renders.
  const [open, setOpen] = useState<string | undefined>(
    () => fields.find((_, index) => !describe(index).complete)?.id ?? fields[fields.length - 1]?.id,
  );
  const openId = open === LAST ? fields[fields.length - 1]?.id : open;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    move(result.source.index, result.destination.index);
  };

  const addAction = (type: string) => {
    append(
      type === "SEND_TEMPLATE"
        ? { type, value: { templateId: "", variableMapping: [] } }
        : type === "SEND_SHOP_PRODUCTS"
          ? { type, value: { productIds: [] } }
          : { type, value: "" },
    );
    setOpen(LAST);
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <Empty className="border p-6">
          <EmptyHeader>
            <EmptyTitle>No actions yet</EmptyTitle>
            <EmptyDescription>
              Add what the automation should do, like sending a message or assigning the chat.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <ExternalApiExample />
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="rule-actions">
          {(droppable) => (
            <ol
              ref={droppable.innerRef}
              {...droppable.droppableProps}
              className="m-0 flex list-none flex-col gap-2.5 p-0"
            >
              {fields.map((field, index) => {
                const isOpen = field.id === openId;
                const summary = describe(index);
                const ActionIcon = ACTION_META[actions?.[index]?.type ?? ""]?.icon ?? IconMessage;
                return (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(draggable, snapshot) => (
                      <li
                        ref={draggable.innerRef}
                        {...draggable.draggableProps}
                        className={cn(
                          "bg-card ring-foreground/10 rounded-xl ring-1",
                          isOpen && "ring-primary/40 ring-[1.5px]",
                          snapshot.isDragging && "shadow-lg",
                        )}
                      >
                        <div className="flex items-center gap-2 py-2 pr-2 pl-1.5">
                          <span
                            {...draggable.dragHandleProps}
                            aria-label={`Reorder action ${index + 1}`}
                            className="text-muted-foreground hover:bg-muted flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md"
                          >
                            <IconGripVertical className="size-4" />
                          </span>
                          <span className="text-muted-foreground w-4 shrink-0 text-center text-xs font-medium tabular-nums">
                            {index + 1}
                          </span>
                          <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                            <ActionIcon className="size-4" aria-hidden />
                          </span>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpen(isOpen ? undefined : field.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span
                              className={cn(
                                "truncate first-letter:uppercase",
                                summary.complete
                                  ? "text-foreground"
                                  : "text-muted-foreground italic",
                              )}
                            >
                              {summary.text}
                            </span>
                            <IconChevronDown
                              className={cn(
                                "text-muted-foreground ml-auto size-4 shrink-0 transition-transform",
                                isOpen && "rotate-180",
                              )}
                              aria-hidden
                            />
                          </button>
                          <Button
                            aria-label={`Delete action ${index + 1}`}
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(index)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <IconTrash className="size-4" />
                          </Button>
                        </div>

                        {isOpen && (
                          <div className="flex flex-col gap-3 px-4 pt-1 pb-4 sm:pl-[4.75rem]">
                            {errors.actions?.[index]?.type && (
                              <FieldError errors={[errors.actions[index].type]} />
                            )}
                            <Controller
                              control={control}
                              name={`actions.${index}.value`}
                              render={({ field: valueField, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                  <ActionValueInput index={index} valueField={valueField} />
                                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                              )}
                            />
                          </div>
                        )}
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {droppable.placeholder}
            </ol>
          )}
        </Droppable>
      </DragDropContext>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" className="self-start" />}
        >
          <IconPlus className="size-4" />
          Add action
          <IconChevronDown className="text-muted-foreground size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {menuGroups.map((group, groupIndex) => (
            <Fragment key={group.label}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.items.map((option) => {
                  const meta = ACTION_META[option.value];
                  const Icon = meta?.icon ?? IconMessage;
                  return (
                    <DropdownMenuItem key={option.value} onClick={() => addAction(option.value)}>
                      <Icon className="size-4" aria-hidden />
                      {meta?.label ?? option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {errors.actions?.root?.message && (
        <p className="text-sm font-medium text-destructive">{errors.actions?.root?.message}</p>
      )}
    </div>
  );
};

export default ActionList;
