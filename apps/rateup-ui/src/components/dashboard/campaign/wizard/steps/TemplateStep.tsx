import {
  IconCornerDownRight,
  IconGripVertical,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import { cn } from "@/lib/utils";
import { WaTemplateCategory } from "@/types/enums.ts";

import { CampaignTemplatePreview } from "../CampaignTemplatePreview.tsx";
import { useTemplateVariables } from "../useTemplateVariables.ts";
import type { CampaignWizardStepProps } from "./step.types.ts";

/** Only approved templates can actually be sent, so only they are offered. */
function useApprovedTemplates(teamId: string) {
  const templates = useTemplatesAvailableForTeam(teamId);
  return useMemo(() => templates.filter((tpl) => tpl?.data?.status === "APPROVED"), [templates]);
}

export function TemplateStep(props: Readonly<CampaignWizardStepProps>) {
  return props.wizard.isDrip ? <DripStagesStep {...props} /> : <BroadcastTemplateStep {...props} />;
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = ["ALL", WaTemplateCategory.MARKETING, WaTemplateCategory.UTILITY] as const;

/**
 * Pick a template, see it, and say where its variables come from — all at once.
 *
 * Three panels: the list, a phone showing the template as it will arrive, and the
 * variable mapping beside it. The old modal had only a name dropdown, so whether
 * the header was an image or a button pointed anywhere was discovered by sending.
 */
function BroadcastTemplateStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { t } = useTranslation("campaign.wizard");
  const { campaign } = wizard;
  const templates = useApprovedTemplates(campaign?.teamId ?? "");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>("ALL");
  const [templateId, setTemplateId] = useState(campaign?.waTemplateId ?? "");
  const [dynamicTags, setDynamicTags] = useState<string[]>(campaign?.dynamicTags ?? []);

  const selected = useMemo(
    () => templates.find((tpl) => tpl.id === templateId),
    [templates, templateId],
  );
  const { placeholders, options } = useTemplateVariables(selected);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (category !== "ALL" && tpl.data?.category !== category) return false;
      return !needle || tpl.data?.name?.toLowerCase().includes(needle);
    });
  }, [templates, search, category]);

  // A new template has its own placeholders, so the previous mapping is
  // meaningless. Sized to the new template rather than cleared, so the selects
  // below always have a slot to write into.
  useEffect(() => {
    if (templateId && templateId !== campaign?.waTemplateId) {
      setDynamicTags(Array<string>(placeholders.length).fill(""));
    }
  }, [templateId, placeholders.length, campaign?.waTemplateId]);

  useEffect(() => {
    registerSubmit(async () => {
      if (!templateId) return;
      // The flow id travels with the template: a template whose button opens a
      // flow only works if the campaign records which flow.
      const flowId =
        selected?.data?.components?.find((c) => c.buttons)?.buttons?.find((b) => b.type === "FLOW")
          ?.flow_id ?? undefined;
      await wizard.saveAndContinue({
        waTemplateId: templateId,
        dynamicTags,
        ...(flowId ? { flowId: String(flowId) } : {}),
      });
    });
  }, [registerSubmit, wizard, templateId, dynamicTags, selected]);

  // What the preview substitutes for each `{{n}}`, so the phone shows a real
  // message rather than a template with holes in it.
  const sampleValues = useMemo(() => {
    const sample: Record<string, string> = {};
    placeholders.forEach((placeholder, index) => {
      const field = dynamicTags[index];
      const label = options.find((option) => option.value === field)?.label;
      const number = /\d+/.exec(placeholder)?.[0];
      if (number) sample[number] = label ? `[${label}]` : placeholder;
    });
    return sample;
  }, [placeholders, dynamicTags, options]);

  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6">
      {/* ── The list ───────────────────────────────────────────────────────── */}
      <div className="flex w-85 min-w-0 shrink-0 flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("Choose a template")}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {t("Only approved templates can be sent. {count} approved.", {
              count: templates.length,
            })}
          </p>
        </div>

        <div className="relative">
          <IconSearch
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search templates")}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5">
          {CATEGORY_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={cn(
                "inline-flex h-6.5 cursor-pointer items-center rounded-full px-2.5 text-xs font-medium",
                option === category
                  ? "bg-foreground text-background"
                  : "text-secondary-foreground ring-foreground/10 ring-1",
              )}
            >
              {option === "ALL" ? t("All") : option.charAt(0) + option.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* p-0.5 is the ring's own width: `ring` paints outside the border box, so
            a scroller with no padding clips the hairline off every card's left and
            right edge — and 2px of it off the selected card's `ring-2`. */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-0.5">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-[13px]">
              {t("No approved templates for this team yet.")}
            </p>
          ) : (
            filtered.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplateId(tpl.id)}
                className={cn(
                  "bg-card flex cursor-pointer flex-col gap-2 rounded-xl px-4 py-3.5 text-left shadow-xs ring-1 transition",
                  tpl.id === templateId
                    ? "ring-primary ring-2"
                    : "ring-foreground/10 hover:shadow-md",
                )}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="truncate font-mono text-[13px] font-medium">
                    {tpl.data?.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-green-600/10 text-green-700 dark:text-green-500"
                  >
                    {t("Approved")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wider">
                    {tpl.data?.category}
                  </span>
                  <span className="text-muted-foreground text-xs">{tpl.data?.language}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── The phone ──────────────────────────────────────────────────────── */}
      {/* p-0.5: the preview card's hairline is a `ring`, painted outside its box,
          so a scroller flush against it clips the border away on every side. */}
      <div className="shrink-0 overflow-y-auto p-0.5">
        <CampaignTemplatePreview
          template={selected?.data}
          businessName={campaign?.teamName}
          sampleValues={sampleValues}
        />
      </div>

      {/* ── Mapping and details ────────────────────────────────────────────── */}
      {/* Same again: `Card` carries `ring-1`, which this scroller would clip. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto p-0.5">
        {placeholders.length > 0 ? (
          <Card data-size="sm">
            <CardContent className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-[15px] font-semibold">
                  {t("Variable mapping")}
                </span>
                <span className="text-muted-foreground text-[12.5px]">
                  {t("Each placeholder in the template body is filled from a contact field.")}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {placeholders.map((placeholder, index) => {
                  const field = dynamicTags[index];
                  const label = options.find((option) => option.value === field)?.label;
                  return (
                    <div
                      key={placeholder}
                      className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2.5"
                    >
                      <span className="bg-secondary text-secondary-foreground rounded-md py-1 text-center font-mono text-xs font-medium">
                        {placeholder}
                      </span>
                      <Select
                        items={options}
                        value={field ?? ""}
                        onValueChange={(value) =>
                          setDynamicTags((previous) => {
                            const next = [...previous];
                            next[index] = value ?? "";
                            return next;
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="w-full min-w-0">
                          <SelectValue placeholder={t("Choose a field")} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* What the recipient will actually see in this slot. */}
                      <span className="text-secondary-foreground inline-flex min-w-0 items-center gap-1.5 text-[13px]">
                        <IconCornerDownRight
                          className="text-muted-foreground/70 size-3.5 shrink-0"
                          aria-hidden
                        />
                        <span className="truncate">{label ?? t("Not mapped")}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {dynamicTags.some((tag) => !tag) ? (
                <div className="text-secondary-foreground flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-[12.5px] leading-snug dark:bg-blue-950/30">
                  <IconInfoCircle className="text-primary mt-px size-4 shrink-0" aria-hidden />
                  {t(
                    "Unmapped placeholders are sent as-is. Map every one before launching, or the message will read oddly.",
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {selected ? (
          <Card data-size="sm">
            <CardContent className="flex flex-col gap-3">
              <span className="font-display text-[15px] font-semibold">
                {t("Template details")}
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
                <Detail label={t("Name")} value={selected.data?.name} mono />
                <Detail label={t("Language")} value={selected.data?.language} />
                <Detail label={t("Category")} value={selected.data?.category} />
                <Detail label={t("Status")} value={selected.data?.status} />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: Readonly<{ label: string; value?: string; mono?: boolean }>) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground/70 text-[11.5px]">{label}</span>
      <span className={cn("truncate", mono && "font-mono text-xs")}>{value ?? "—"}</span>
    </div>
  );
}

// ── Drip ──────────────────────────────────────────────────────────────────────

interface DripStagesForm {
  stages: {
    id?: string;
    templateId: string;
    delay: number;
    delayUnit: string;
    sendAtTime: string;
  }[];
}

const NEW_STAGE = { templateId: "", delay: 1, delayUnit: "days", sendAtTime: "09:00" };

/**
 * The drip stage builder.
 *
 * On `useFieldArray` rather than the separate `useState<DripStage[]>` the old
 * modal kept: there, the stages lived outside the form, and their validation was
 * duplicated between `isFormValid` and `handleSubmit` — the two drifted, which is
 * where most of that dialog's bugs came from.
 */
function DripStagesStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { t } = useTranslation("campaign.wizard");
  const { campaign } = wizard;
  const templates = useApprovedTemplates(campaign?.teamId ?? "");

  const form = useForm<DripStagesForm>({
    defaultValues: {
      stages: campaign?.dripStages?.length
        ? campaign.dripStages.map((stage) => ({
            id: stage.id,
            templateId: stage.waTemplateId ?? "",
            delay: stage.delay ?? 1,
            delayUnit: stage.delayUnit ?? "days",
            sendAtTime: stage.sendAtTime ?? "09:00",
          }))
        : [{ ...NEW_STAGE }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "stages" });
  const stages = form.watch("stages");

  const templateOptions = useMemo(
    () => templates.map((tpl) => ({ value: tpl.id, label: tpl.data?.name ?? tpl.id })),
    [templates],
  );
  const unitOptions = useMemo(
    () => [
      { value: "minutes", label: t("minutes") },
      { value: "hours", label: t("hours") },
      { value: "days", label: t("days") },
    ],
    [t],
  );

  useEffect(() => {
    registerSubmit(
      form.handleSubmit(async (values) => {
        if (values.stages.some((stage) => !stage.templateId)) {
          form.setError("stages", { message: t("Every stage needs a template.") });
          return;
        }
        await wizard.saveAndContinue({ dripStages: values.stages });
      }),
    );
  }, [registerSubmit, form, wizard, t]);

  const selectedForPreview = templates.find((tpl) => tpl.id === stages?.[0]?.templateId);

  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-0.5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("Build the sequence")}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {t("Each stage sends once, the given delay after the contact joins.")}
          </p>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} data-size="sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <IconGripVertical className="size-3.5" aria-hidden />
                  {t("Stage {index}", { index: index + 1 })}
                </span>
                {fields.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    aria-label={t("Remove stage")}
                  >
                    <IconTrash className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>

              <Controller
                control={form.control}
                name={`stages.${index}.templateId`}
                render={({ field: templateField }) => (
                  <Select
                    items={templateOptions}
                    value={templateField.value}
                    onValueChange={(value) => templateField.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Choose a template")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              <div className="grid grid-cols-3 gap-2">
                <Controller
                  control={form.control}
                  name={`stages.${index}.delay`}
                  render={({ field: delayField }) => (
                    <Input
                      type="number"
                      min={0}
                      value={delayField.value}
                      onChange={(event) => delayField.onChange(Number(event.target.value))}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`stages.${index}.delayUnit`}
                  render={({ field: unitField }) => (
                    <Select
                      items={unitOptions}
                      value={unitField.value}
                      onValueChange={(value) => unitField.onChange(value ?? "days")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`stages.${index}.sendAtTime`}
                  render={({ field: timeField }) => <Input type="time" {...timeField} />}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {form.formState.errors.stages?.message ? (
          <p className="text-destructive text-[13px]">{form.formState.errors.stages.message}</p>
        ) : null}

        <div>
          <Button variant="outline" onClick={() => append({ ...NEW_STAGE })}>
            <IconPlus className="size-4" aria-hidden />
            {t("Add stage")}
          </Button>
        </div>
      </div>

      <div className="shrink-0 overflow-y-auto p-0.5">
        <CampaignTemplatePreview
          template={selectedForPreview?.data}
          businessName={campaign?.teamName}
        />
      </div>
    </div>
  );
}
