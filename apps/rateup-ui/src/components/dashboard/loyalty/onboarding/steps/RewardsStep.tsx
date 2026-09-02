import { zodResolver } from "@hookform/resolvers/zod";
import { IconGift, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, type ControllerRenderProps } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
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
import { StepFooter, StepHeader } from "../StepChrome.tsx";

interface RewardsStepProps {
  defaultValues: RewardsFormInput;
  pointsName: string;
  giveback: GivebackContext;
  isSaving: boolean;
  onBack: () => void;
  onEditAverageOrderValue: () => void;
  onSubmit: (values: RewardsFormValues) => void;
}

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
  onBack,
  onEditAverageOrderValue,
  onSubmit,
}: Readonly<RewardsStepProps>) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<RewardsFormInput, unknown, RewardsFormValues>({
    resolver: zodResolver(rewardsFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rewards" });
  const rewardsError = form.formState.errors.rewards;

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

  const existingNames = form
    .watch("rewards")
    .map((reward) => (reward?.name ?? "").trim().toLowerCase());

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        title={t("Rewards")}
        description={t("What customers can spend their {points} on.", { points: pointsName })}
      />

      <div className="flex flex-col gap-3">
        {fields.map((item, index) => (
          <RewardRow
            key={item.id}
            index={index}
            form={form}
            giveback={giveback}
            pointsName={pointsName}
            onRemove={() => remove(index)}
          />
        ))}

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
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => setIsAdding(true)}
          >
            <IconPlus size={16} />
            {t("Add reward")}
          </Button>
        )}
      </div>

      <RewardsGivebackPanel
        control={form.control}
        context={giveback}
        onEditAverageOrderValue={onEditAverageOrderValue}
      />

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

      <StepFooter isSaving={isSaving} onBack={onBack} />
    </form>
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
  onRemove,
}: Readonly<{
  index: number;
  form: ReturnType<typeof useForm<RewardsFormInput, unknown, RewardsFormValues>>;
  giveback: GivebackContext;
  pointsName: string;
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
      </CardContent>
    </Card>
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
