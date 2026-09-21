import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCarouselHorizontal,
  IconExternalLink,
  IconList,
  IconMapPin,
  IconMapPinShare,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRoute,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  UI_SKILL_COMPONENT_TYPES,
  type UiSkill,
  type UiSkillComponentType,
} from "@/backend/metaAgent/metaAgent.api";
import {
  useCreateUiSkill,
  useDeleteUiSkill,
  useSyncUiSkills,
  useUiSkills,
  useUpdateUiSkill,
} from "@/backend/metaAgent/metaAgent.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FlowSelector } from "@/components/whatsapp/flows/FlowSelector/FlowSelector";

import { uiSkillFormSchema, type UiSkillFormValues } from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

const COMPONENTS: Record<
  UiSkillComponentType,
  { label: string; blurb: string; icon: React.ComponentType<{ className?: string }> }
> = {
  carousel_quick_reply: {
    label: "Carousel with quick replies",
    blurb: "A swipeable card set where each card offers tappable replies.",
    icon: IconCarouselHorizontal,
  },
  carousel_url: {
    label: "Carousel with links",
    blurb: "A swipeable card set where each card links out to your site.",
    icon: IconCarouselHorizontal,
  },
  cta_url: {
    label: "Call-to-action link",
    blurb: "A single message with one prominent link button.",
    icon: IconExternalLink,
  },
  flow: {
    label: "WhatsApp Flow",
    blurb: "Opens one of your published Flows.",
    icon: IconRoute,
  },
  image: { label: "Image", blurb: "Sends an image alongside the reply.", icon: IconPhoto },
  interactive_list: {
    label: "Interactive list",
    blurb: "A tappable list of options in a bottom sheet.",
    icon: IconList,
  },
  location: { label: "Location", blurb: "Shares a pin on the map.", icon: IconMapPin },
  location_request: {
    label: "Location request",
    blurb: "Asks the customer to share where they are.",
    icon: IconMapPinShare,
  },
};

/**
 * Meta stores a flow by id; a bare 16-digit number means nothing to the person
 * reading the list, so it is resolved back to the flow's name where we know it.
 */
function useFlowName() {
  const { data: flows } = useWaFlowsFromDb();
  return (flowId?: string | null) => {
    if (!flowId) return null;
    return flows?.find((flow) => String(flow.flowId) === String(flowId))?.name ?? `Flow ${flowId}`;
  };
}

export function UiSkillsSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const flowName = useFlowName();
  const { data: uiSkills, isLoading } = useUiSkills(waSettingsId);
  const deleteUiSkill = useDeleteUiSkill(waSettingsId);
  const updateUiSkill = useUpdateUiSkill(waSettingsId);
  const sync = useSyncUiSkills(waSettingsId);
  const [editing, setEditing] = useState<UiSkill | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <PanelCard
      title="UI skills"
      description="Rich components the agent may send instead of plain text. Disabled ones stay configured but unused."
      count={uiSkills?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <IconPlus data-icon="inline-start" />
          Add UI skill
        </Button>
      }
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && !uiSkills?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No UI skills configured</EmptyTitle>
          <EmptyDescription>
            Let the agent answer with a carousel, a link button or one of your WhatsApp Flows rather
            than a wall of text.
          </EmptyDescription>
        </Empty>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {uiSkills?.map((uiSkill) => {
          const meta = COMPONENTS[uiSkill.componentType];
          const Icon = meta?.icon ?? IconPhoto;
          const enabled = uiSkill.status === "enabled";
          return (
            <div key={uiSkill.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{uiSkill.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta?.label ?? uiSkill.componentType}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${uiSkill.title}`}
                    onClick={() => setEditing(uiSkill)}
                  >
                    <IconPencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${uiSkill.title}`}
                    loading={deleteUiSkill.isPending}
                    onClick={() => deleteUiSkill.mutate(uiSkill.id)}
                  >
                    <IconTrash className="text-destructive" />
                  </Button>
                </div>
              </div>

              <p className="line-clamp-2 text-xs text-muted-foreground">{uiSkill.instruction}</p>

              <div className="flex items-center justify-between gap-2 border-t pt-2">
                {uiSkill.flowId ? (
                  <Badge variant="outline" className="max-w-40 truncate text-xs">
                    <IconRoute data-icon="inline-start" />
                    {flowName(uiSkill.flowId)}
                  </Badge>
                ) : (
                  <span />
                )}
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {enabled ? "Enabled" : "Disabled"}
                  <Switch
                    checked={enabled}
                    aria-label={`${enabled ? "Disable" : "Enable"} ${uiSkill.title}`}
                    disabled={updateUiSkill.isPending}
                    onCheckedChange={(checked) =>
                      updateUiSkill.mutate({
                        uiSkillId: uiSkill.id,
                        data: { status: checked ? "enabled" : "disabled" },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <UiSkillDialog
        waSettingsId={waSettingsId}
        uiSkill={editing}
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </PanelCard>
  );
}

function UiSkillDialog({
  waSettingsId,
  uiSkill,
  open,
  onOpenChange,
}: Readonly<{
  waSettingsId: string;
  uiSkill: UiSkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const createUiSkill = useCreateUiSkill(waSettingsId);
  const updateUiSkill = useUpdateUiSkill(waSettingsId);
  const flowName = useFlowName();

  const form = useForm<UiSkillFormValues>({
    resolver: zodResolver(uiSkillFormSchema),
    values: {
      title: uiSkill?.title ?? "",
      component_type: uiSkill?.componentType ?? "cta_url",
      status: uiSkill?.status ?? "enabled",
      instruction: uiSkill?.instruction ?? "",
      flow_id: uiSkill?.flowId ?? "",
    },
  });

  const componentType = form.watch("component_type");
  const isPending = createUiSkill.isPending || updateUiSkill.isPending;

  const onSubmit = (values: UiSkillFormValues) => {
    const done = { onSuccess: () => onOpenChange(false) };
    if (uiSkill) {
      // Meta's update endpoint takes only these three — component_type and
      // flow_id are fixed once the skill exists.
      updateUiSkill.mutate(
        {
          uiSkillId: uiSkill.id,
          data: {
            title: values.title,
            status: values.status,
            instruction: values.instruction,
          },
        },
        done,
      );
      return;
    }
    createUiSkill.mutate(
      {
        title: values.title,
        component_type: values.component_type,
        status: values.status,
        instruction: values.instruction,
        ...(values.flow_id ? { flow_id: values.flow_id } : {}),
      },
      done,
    );
  };

  const componentItems = UI_SKILL_COMPONENT_TYPES.map((value) => ({
    value,
    label: COMPONENTS[value].label,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{uiSkill ? "Edit UI skill" : "Add UI skill"}</DialogTitle>
          <DialogDescription>
            {uiSkill
              ? "The component type is fixed once a UI skill exists — delete and recreate it to change that."
              : "Pick a component and describe the moment the agent should reach for it."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <FormField control={form.control} name="title" label="Title" required>
              {(field, controlProps) => (
                <Input {...field} {...controlProps} placeholder="Book a table" />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="component_type"
              label="Component type"
              required
              description={COMPONENTS[componentType]?.blurb}
            >
              {(field, controlProps) => (
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "cta_url")}
                  disabled={!!uiSkill}
                  items={componentItems}
                >
                  <SelectTrigger {...controlProps} className="w-full">
                    <SelectValue placeholder="Choose a component" />
                  </SelectTrigger>
                  <SelectContent>
                    {componentItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {componentType === "flow" &&
              // Meta's update endpoint does not accept flow_id, so on an existing
              // skill the flow is shown rather than offered — a picker you cannot
              // save would just be a trap.
              (uiSkill ? (
                <Field>
                  <FieldLabel>Flow</FieldLabel>
                  <Badge variant="outline" className="w-fit">
                    <IconRoute data-icon="inline-start" />
                    {flowName(uiSkill.flowId) ?? "—"}
                  </Badge>
                  <FieldDescription>
                    The flow is fixed once a UI skill exists — delete and recreate it to point at a
                    different one.
                  </FieldDescription>
                </Field>
              ) : (
                <Controller
                  control={form.control}
                  name="flow_id"
                  render={({ field, fieldState }) => (
                    // FlowSelector is a complete field in its own right — label,
                    // control and error — so it stands in for FormField here
                    // rather than nesting inside one.
                    <FlowSelector
                      onlyPublished
                      // The Meta-side id, which is what the UI-skills API stores.
                      id="flowId"
                      value={field.value}
                      onChange={field.onChange}
                      label={
                        <span className="flex items-center gap-1 text-sm font-medium">
                          Flow
                          <span aria-hidden className="text-destructive">
                            *
                          </span>
                          <span className="sr-only">(required)</span>
                        </span>
                      }
                      placeholder="Select a published flow"
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ))}

            <FormField
              control={form.control}
              name="instruction"
              label="When to send it"
              required
              hint={`${form.watch("instruction").length}/4096`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={4}
                  placeholder="When the customer asks to reserve a table or check availability for a date."
                />
              )}
            </FormField>

            <FormField control={form.control} name="status" label="Status" orientation="horizontal">
              {(field) => (
                <Switch
                  checked={field.value === "enabled"}
                  onCheckedChange={(checked) => field.onChange(checked ? "enabled" : "disabled")}
                />
              )}
            </FormField>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {uiSkill ? "Save changes" : "Create UI skill"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
