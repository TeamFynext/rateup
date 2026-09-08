import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconChevronRight,
  IconGift,
  IconPlus,
  IconTicket,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type Control,
  type ControllerRenderProps,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider";
import { cn } from "@/lib/utils.ts";
import { numberInputValue } from "@/utils/form.ts";

import { toFiniteNumber } from "../../giveback/calculateGiveback.ts";
import {
  RewardExamplePicker,
  type RewardExamplePick,
} from "../../giveback/RewardExamplePicker.tsx";
import { RewardWorthLine } from "../../giveback/RewardWorthLine.tsx";
import { RewardsGivebackPanel } from "../../giveback/StepGivebackPanels.tsx";
import { FALLBACK_POINTS_COST } from "../../giveback/suggestPointsCost.ts";
import type { GivebackContext } from "../givebackContext.ts";
import {
  asRewardValueType,
  blankRewardValue,
  convertRewardValue,
  readAmount,
  readCap,
  readItemName,
  readItemValue,
  readPercentage,
  readRewardValueType,
  toRewardValueRecord,
} from "../rewardValue.ts";
import {
  rewardsFormSchema,
  type RewardFormRow,
  type RewardsFormInput,
  type RewardsFormValues,
} from "../schemas.ts";
import {
  StepFooter,
  StepHeader,
  StepLayout,
  useStepFooterProps,
  type StepMode,
} from "../StepChrome.tsx";

interface RewardsStepProps {
  defaultValues: RewardsFormInput;
  pointsName: string;
  giveback: GivebackContext;
  isSaving: boolean;
  mode?: StepMode;
  onBack?: () => void;
  onCancel?: () => void;
  onEditAverageOrderValue: () => void;
  onSubmit: (values: RewardsFormValues) => void;
  railExtra?: React.ReactNode;
  /** Tiers a reward can be restricted to. Values are whatever `availableForTiers` stores. */
  tierOptions?: ReadonlyArray<{ value: string; label: string }>;
  /** Where coupons and free gifts — kinds this form only lists — are created and edited. */
  advancedEditorHref?: React.ReactNode;
}

type RewardKindFilter = "all" | "point" | "coupon" | "assigned";

/** The `rewardValue` field, as handed over by its Controller. */
type RewardValueField = ControllerRenderProps<RewardsFormInput, `rewards.${number}.rewardValue`>;

/**
 * Pulls the message out of a `rewardValue` issue.
 *
 * The schema raises these at nested paths (`rewards.0.rewardValue.item_name`), which no
 * single Controller owns — `rewardValue` is one form value holding several inputs. Without
 * this the form just refuses to advance and says nothing, which reads as a broken button.
 */
function valueErrorFor(error: unknown, key: string): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const nested = (error as Record<string, unknown>)[key];
  if (!nested || typeof nested !== "object") return undefined;
  const message = (nested as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

export function RewardsStep({
  defaultValues,
  pointsName,
  giveback,
  isSaving,
  mode = "wizard",
  onBack,
  onCancel,
  onEditAverageOrderValue,
  onSubmit,
  railExtra,
  tierOptions = [],
  advancedEditorHref,
}: Readonly<RewardsStepProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [isAdding, setIsAdding] = useState(false);
  const [kindFilter, setKindFilter] = useState<RewardKindFilter>("all");

  const form = useForm<RewardsFormInput, unknown, RewardsFormValues>({
    resolver: zodResolver(rewardsFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rewards" });
  const rewardsError = form.formState.errors.rewards;
  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onBack, onCancel });

  const watchedRewards = form.watch("rewards");
  const kindCounts = {
    all: watchedRewards.length,
    point: watchedRewards.filter((r) => r.rewardType === "point").length,
    coupon: watchedRewards.filter((r) => r.rewardType === "coupon").length,
    assigned: watchedRewards.filter((r) => r.rewardType === "assigned").length,
  };
  const showKindFilter = kindCounts.coupon + kindCounts.assigned > 0;

  /**
   * A saved reward is not simply dropped: customers may be holding it. The API retires a
   * reward in use rather than deleting it, so the confirm says that plainly.
   */
  const removeReward = async (index: number) => {
    const row = watchedRewards[index];
    if (row?.id) {
      const ok = await confirm({
        title: t("Remove {name}?", { name: row.name || t("this reward") }),
        description: t(
          "If customers are holding it or have redeemed it before, it is retired instead: nobody new can get it, and anyone holding one can still use theirs. Past redemptions stay in Activity.",
        ),
        confirmText: t("Remove"),
      });
      if (!ok) return;
    }
    remove(index);
  };

  const addReward = (pick: RewardExamplePick) => {
    const index = fields.length;
    const row: RewardFormRow = pick.built
      ? {
          name: pick.built.label,
          description: pick.built.example.description,
          pointsCost: pick.built.pointsCost ?? FALLBACK_POINTS_COST,
          rewardType: "point",
          rewardValue: toRewardValueRecord(pick.built.rewardValue),
        }
      : {
          name: "",
          description: "",
          pointsCost: FALLBACK_POINTS_COST,
          rewardType: "point",
          rewardValue: toRewardValueRecord(blankRewardValue(pick.kind)),
        };

    append(row);
    // Land in the name box: a blank tile arrives nameless, which is invalid until they type.
    window.setTimeout(() => form.setFocus(`rewards.${index}.name`), 0);
  };

  const existingNames = watchedRewards.map((reward) => (reward?.name ?? "").trim().toLowerCase());

  const panel = (
    <RewardsGivebackPanel
      control={form.control}
      context={giveback}
      onEditAverageOrderValue={onEditAverageOrderValue}
      {...(mode === "section"
        ? { title: t("What this costs you"), hint: t("Updates as you edit") }
        : {})}
    />
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        title={t("Rewards")}
        description={t("What customers can spend their {points} on.", { points: pointsName })}
      />

      <StepLayout
        mode={mode}
        aside={
          <>
            {panel}
            {railExtra}
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Joining and referring are rewards paid for a behaviour rather than for spend.
          They are edited here, beside the rewards they share a budget with. */}
          <Card className="border-border bg-muted/30">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-start gap-3">
                <IconUsers className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("Points for joining and referring")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Given out for signing up and for bringing a friend. Set any of them to 0 to switch it off.",
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <BonusField
                  control={form.control}
                  name="signupBonus"
                  label={t("Points for joining")}
                />
                <BonusField
                  control={form.control}
                  name="referralBonus"
                  label={t("Points for referring a friend")}
                />
                <BonusField
                  control={form.control}
                  name="refereeBonus"
                  label={t("Points for the friend who joins")}
                />
              </div>
            </CardContent>
          </Card>

          {showKindFilter && (
            <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(v as RewardKindFilter)}>
              <TabsList>
                <TabsTrigger value="all">
                  {t("All")} · {kindCounts.all}
                </TabsTrigger>
                <TabsTrigger value="point">
                  {t("Point rewards")} · {kindCounts.point}
                </TabsTrigger>
                <TabsTrigger value="coupon">
                  {t("Coupons")} · {kindCounts.coupon}
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  {t("Free gifts")} · {kindCounts.assigned}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="flex flex-col gap-3">
            {fields.map((item, index) => {
              const kind = watchedRewards[index]?.rewardType ?? "point";
              if (kindFilter !== "all" && kind !== kindFilter) return null;
              if (kind !== "point") {
                return (
                  <ReadOnlyRewardRow
                    key={item.id}
                    row={watchedRewards[index]}
                    pointsName={pointsName}
                    advancedEditorHref={advancedEditorHref}
                    onRemove={() => void removeReward(index)}
                  />
                );
              }
              return (
                <RewardRow
                  key={item.id}
                  index={index}
                  form={form}
                  giveback={giveback}
                  pointsName={pointsName}
                  tierOptions={tierOptions}
                  onRemove={() => void removeReward(index)}
                />
              );
            })}

            {fields.length === 0 && (
              <Empty className="rounded-lg border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconGift />
                  </EmptyMedia>
                  <EmptyTitle>{t("No rewards yet")}</EmptyTitle>
                  <EmptyDescription>
                    {t("Customers can still earn points, but they will have nothing to redeem.")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button type="button" size="sm" onClick={() => setIsAdding(true)}>
                    <IconPlus size={16} />
                    {t("Add a reward")}
                  </Button>
                </EmptyContent>
              </Empty>
            )}

            {typeof rewardsError?.root?.message === "string" && (
              <p className="text-xs text-destructive">{rewardsError.root.message}</p>
            )}

            {fields.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
                  <IconPlus size={16} />
                  {t("Add reward")}
                </Button>
                {advancedEditorHref && (
                  <span className="text-xs text-muted-foreground">
                    {t("Coupon codes and free gifts:")} {advancedEditorHref}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </StepLayout>

      <RewardExamplePicker
        open={isAdding}
        onOpenChange={setIsAdding}
        presetKey={giveback.presetKey}
        earnRate={giveback.earnRate}
        averageOrderValue={giveback.averageOrderValue}
        currencyCode={giveback.currencyCode}
        currencySymbol={giveback.currencySymbol}
        pointsName={giveback.pointsName}
        existingNames={existingNames}
        onPick={addReward}
        onEditAverageOrderValue={onEditAverageOrderValue}
      />

      <StepFooter isSaving={isSaving} {...footer} />
    </form>
  );
}

/**
 * The three bonus inputs differ only by field. Mapping over them inline widens `name` to
 * a union, which erases the per-field value type — hence a component with one concrete
 * name per call site.
 */
function BonusField({
  control,
  name,
  label,
}: Readonly<{
  control: Control<RewardsFormInput>;
  name: "signupBonus" | "referralBonus" | "refereeBonus";
  label: string;
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name} className="text-xs">
            {label}
          </FieldLabel>
          <Input
            id={field.name}
            type="number"
            min={0}
            className="h-9 bg-background"
            aria-invalid={fieldState.invalid}
            {...field}
            value={numberInputValue(field.value)}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/**
 * Coupons and free gifts are listed with the point rewards — they answer the same customer
 * question — but their fields live in another dialect, so they are edited in the full
 * editor. The row still saves through untouched, so a Save here never loses them.
 */
function ReadOnlyRewardRow({
  row,
  pointsName,
  advancedEditorHref,
  onRemove,
}: Readonly<{
  row: RewardFormRow | undefined;
  pointsName: string;
  advancedEditorHref?: React.ReactNode;
  onRemove: () => void;
}>) {
  const { t } = useTranslation();
  if (!row) return null;
  const isCoupon = row.rewardType === "coupon";
  const Icon = isCoupon ? IconTicket : IconGift;
  const value = row.rewardValue as {
    code?: unknown;
    discountValue?: unknown;
    discountType?: unknown;
  };

  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border",
            isCoupon
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-500"
              : "border-green-200 bg-green-600/10 text-green-700 dark:border-green-900 dark:text-green-500",
          )}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            <Badge variant="outline">{isCoupon ? t("Coupon code") : t("Free gift")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isCoupon
              ? typeof value.code === "string" && value.code
                ? t("Code {code} · staff type it at the counter", { code: value.code })
                : t("No {points} needed — staff type the code at the counter", {
                    points: pointsName,
                  })
              : t("Handed to a named customer with a code")}
            {advancedEditorHref ? <> · {advancedEditorHref}</> : null}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("Remove reward")}
          onClick={onRemove}
        >
          <IconTrash size={16} />
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * One reward, in three bands: what it is called, what it is and costs, what it costs you.
 *
 * The type Select and the per-type fields share a single `Controller` on `rewardValue` —
 * they edit one form value, and splitting them across Controllers means two of them writing
 * over each other's object.
 */
function RewardRow({
  index,
  form,
  giveback,
  pointsName,
  tierOptions,
  onRemove,
}: Readonly<{
  index: number;
  form: ReturnType<typeof useForm<RewardsFormInput, unknown, RewardsFormValues>>;
  giveback: GivebackContext;
  pointsName: string;
  tierOptions: ReadonlyArray<{ value: string; label: string }>;
  onRemove: () => void;
}>) {
  const { t } = useTranslation();

  const rewardValue = form.watch(`rewards.${index}.rewardValue`);
  const pointsCost = form.watch(`rewards.${index}.pointsCost`);
  const type = readRewardValueType(rewardValue);

  const typeItems = useMemo(
    () => [
      { value: "free_item", label: t("Something free") },
      { value: "discount_percentage", label: t("Percentage off") },
      { value: "discount_fixed", label: t("Cash off") },
    ],
    [t],
  );

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4">
        {/* Band 1 — what it is called. */}
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name={`rewards.${index}.name`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="min-w-0 flex-1">
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Reward")}
                </FieldLabel>
                <Input id={field.name} className="h-9" {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Remove reward")}
            className="mt-6 shrink-0"
            onClick={onRemove}
          >
            <IconTrash size={16} />
          </Button>
        </div>

        {/* Band 2 — what it is, and what it costs. Fields flow, so a type needing
            fewer of them simply ends the row early. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Controller
            control={form.control}
            name={`rewards.${index}.rewardValue`}
            render={({ field, fieldState }) => (
              <>
                <Field>
                  <FieldLabel htmlFor={`${field.name}.type`} className="text-xs">
                    {t("Type")}
                  </FieldLabel>
                  <Select
                    name={`${field.name}.type`}
                    value={type ?? ""}
                    onValueChange={(next) =>
                      field.onChange(
                        toRewardValueRecord(
                          convertRewardValue(
                            field.value,
                            asRewardValueType(next, type ?? "discount_percentage"),
                            giveback.averageOrderValue,
                          ),
                        ),
                      )
                    }
                    items={typeItems}
                  >
                    <SelectTrigger id={`${field.name}.type`} className="h-9 w-full">
                      <SelectValue placeholder={t("Pick a type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_item">{t("Something free")}</SelectItem>
                      <SelectItem value="discount_percentage">{t("Percentage off")}</SelectItem>
                      <SelectItem value="discount_fixed">{t("Cash off")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {type === "free_item" && (
                  <FreeItemFields
                    field={field}
                    currencySymbol={giveback.currencySymbol}
                    error={fieldState.error}
                  />
                )}
                {type === "discount_percentage" && (
                  <PercentageFields
                    field={field}
                    currencySymbol={giveback.currencySymbol}
                    error={fieldState.error}
                  />
                )}
                {type === "discount_fixed" && (
                  <CashOffFields
                    field={field}
                    currencySymbol={giveback.currencySymbol}
                    error={fieldState.error}
                  />
                )}
              </>
            )}
          />

          <Controller
            control={form.control}
            name={`rewards.${index}.pointsCost`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Costs ({points})", { points: pointsName })}
                </FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  className="h-9"
                  {...field}
                  value={numberInputValue(field.value)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {/* Band 3 — what it costs you, full width. */}
        <RewardWorthLine
          rewardValue={rewardValue}
          pointsCost={toFiniteNumber(pointsCost)}
          earnRate={giveback.earnRate}
          averageOrderValue={giveback.averageOrderValue}
          currencySymbol={giveback.currencySymbol}
          currencyCode={giveback.currencyCode}
        />

        <RewardAdvanced index={index} form={form} tierOptions={tierOptions} />
      </CardContent>
    </Card>
  );
}

/**
 * Stock, who may redeem it, a description — folded away so the card keeps the sentence a
 * merchant can read out loud. Limits and validity (redemption rules) stay in the full
 * editor; this form never touches them.
 */
function RewardAdvanced({
  index,
  form,
  tierOptions,
}: Readonly<{
  index: number;
  form: ReturnType<typeof useForm<RewardsFormInput, unknown, RewardsFormValues>>;
  tierOptions: ReadonlyArray<{ value: string; label: string }>;
}>) {
  const { t } = useTranslation();

  return (
    <Collapsible>
      <CollapsibleTrigger
        className={cn(
          "group inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground",
          "hover:bg-muted hover:text-foreground data-[panel-open]:bg-primary/10 data-[panel-open]:text-primary",
        )}
      >
        <IconChevronRight
          size={14}
          className="transition-transform group-data-[panel-open]:rotate-90"
        />
        {t("Advanced")}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name={`rewards.${index}.description`}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Description")}
                </FieldLabel>
                <Input id={field.name} className="h-9" {...field} value={field.value ?? ""} />
                <FieldDescription className="text-xs">
                  {t("Shown under the reward in the WhatsApp list.")}
                </FieldDescription>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name={`rewards.${index}.stockQuantity`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Stock")}
                </FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  className="h-9"
                  placeholder={t("Unlimited")}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={numberInputValue(field.value as number | string | null | undefined)}
                  onChange={(event) => field.onChange(event.target.value)}
                />
                <FieldDescription className="text-xs">
                  {t("Leave empty for no limit.")}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {tierOptions.length > 0 && (
          <Controller
            control={form.control}
            name={`rewards.${index}.availableForTiers`}
            render={({ field }) => {
              const selected = new Set(field.value ?? []);
              return (
                <Field>
                  <FieldLabel className="text-xs">{t("Who can redeem it")}</FieldLabel>
                  <div className="flex flex-wrap gap-4">
                    {tierOptions.map((tier) => (
                      <label key={tier.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selected.has(tier.value)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selected);
                            if (checked) next.add(tier.value);
                            else next.delete(tier.value);
                            field.onChange(
                              tierOptions.map((o) => o.value).filter((v) => next.has(v)),
                            );
                          }}
                        />
                        {tier.label}
                      </label>
                    ))}
                  </div>
                  <FieldDescription className="text-xs">
                    {selected.size === 0
                      ? t("Every tier can redeem it.")
                      : t("Only the tiers ticked can redeem it.")}
                  </FieldDescription>
                </Field>
              );
            }}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Writes one key onto the reward value, leaving the rest of the shape intact. */
function patch(field: RewardValueField, key: string, value: number | string | null | undefined) {
  field.onChange({ ...field.value, [key]: value });
}

/** `""` means "not set" for an optional number, not 0 — 0 would be a real answer. */
function numberOrUndefined(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

function FreeItemFields({
  field,
  currencySymbol,
  error,
}: Readonly<{ field: RewardValueField; currencySymbol: string; error?: unknown }>) {
  const { t } = useTranslation();
  const itemNameError = valueErrorFor(error, "item_name");

  return (
    <>
      <Field data-invalid={itemNameError !== undefined}>
        <FieldLabel htmlFor={`${field.name}.item_name`} className="text-xs">
          {t("Item")}
        </FieldLabel>
        <Input
          id={`${field.name}.item_name`}
          className="h-9"
          placeholder={t("Regular hot drink")}
          aria-invalid={itemNameError !== undefined}
          value={readItemName(field.value)}
          onChange={(event) => patch(field, "item_name", event.target.value)}
        />
        {itemNameError !== undefined && <FieldError errors={[{ message: itemNameError }]} />}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${field.name}.item_value`} className="text-xs">
          {t("Worth about")}
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon>{currencySymbol}</InputGroupAddon>
          <InputGroupInput
            id={`${field.name}.item_value`}
            type="number"
            min={0}
            value={numberInputValue(readItemValue(field.value))}
            onChange={(event) => patch(field, "item_value", numberOrUndefined(event.target.value))}
          />
        </InputGroup>
        <FieldDescription className="text-xs">{t("What it normally sells for.")}</FieldDescription>
      </Field>
    </>
  );
}

function PercentageFields({
  field,
  currencySymbol,
  error,
}: Readonly<{ field: RewardValueField; currencySymbol: string; error?: unknown }>) {
  const { t } = useTranslation();
  const percentageError = valueErrorFor(error, "percentage");

  return (
    <>
      <Field data-invalid={percentageError !== undefined}>
        <FieldLabel htmlFor={`${field.name}.percentage`} className="text-xs">
          {t("Percent off")}
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={`${field.name}.percentage`}
            type="number"
            min={0}
            max={100}
            value={numberInputValue(readPercentage(field.value))}
            onChange={(event) => patch(field, "percentage", numberOrUndefined(event.target.value))}
          />
          <InputGroupAddon align="inline-end">%</InputGroupAddon>
        </InputGroup>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${field.name}.max_discount_amount`} className="text-xs">
          {t("Cap it at")}
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon>{currencySymbol}</InputGroupAddon>
          <InputGroupInput
            id={`${field.name}.max_discount_amount`}
            type="number"
            min={0}
            value={numberInputValue(readCap(field.value) ?? undefined)}
            onChange={(event) =>
              // Null, not undefined: an absent cap is a real, stored answer.
              patch(field, "max_discount_amount", numberOrUndefined(event.target.value) ?? null)
            }
          />
        </InputGroup>
        <FieldDescription className="text-xs">{t("Optional.")}</FieldDescription>
      </Field>
    </>
  );
}

function CashOffFields({
  field,
  currencySymbol,
  error,
}: Readonly<{ field: RewardValueField; currencySymbol: string; error?: unknown }>) {
  const { t } = useTranslation();
  const amountError = valueErrorFor(error, "amount");

  return (
    <Field data-invalid={amountError !== undefined}>
      <FieldLabel htmlFor={`${field.name}.amount`} className="text-xs">
        {t("Amount off")}
      </FieldLabel>
      <InputGroup>
        <InputGroupAddon>{currencySymbol}</InputGroupAddon>
        <InputGroupInput
          id={`${field.name}.amount`}
          type="number"
          min={0}
          value={numberInputValue(readAmount(field.value))}
          onChange={(event) => patch(field, "amount", numberOrUndefined(event.target.value))}
        />
      </InputGroup>
      {amountError !== undefined && <FieldError errors={[{ message: amountError }]} />}
    </Field>
  );
}
