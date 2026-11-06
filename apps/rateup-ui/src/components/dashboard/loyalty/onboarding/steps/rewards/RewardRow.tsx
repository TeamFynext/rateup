import { IconChevronRight, IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import { Controller, type ControllerRenderProps, type useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
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
import { cn } from "@/lib/utils.ts";
import { numberInputValue } from "@/utils/form.ts";

import { toFiniteNumber } from "../../../giveback/calculateGiveback.ts";
import { RewardWorthLine } from "../../../giveback/RewardWorthLine.tsx";
import type { GivebackContext } from "../../givebackContext.ts";
import {
  asRewardValueType,
  convertRewardValue,
  readAmount,
  readCap,
  readItemName,
  readItemValue,
  readPercentage,
  readRewardValueType,
  toRewardValueRecord,
} from "../../rewardValue.ts";
import type { RewardsFormInput, RewardsFormValues } from "../../schemas.ts";

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

/**
 * One reward, in three bands: what it is called, what it is and costs, what it costs you.
 *
 * The type Select and the per-type fields share a single `Controller` on `rewardValue` —
 * they edit one form value, and splitting them across Controllers means two of them writing
 * over each other's object.
 */
export function RewardRow({
  index,
  form,
  giveback,
  pointsName,
  tierOptions,
  showTierPicker = true,
  onRemove,
}: Readonly<{
  index: number;
  form: ReturnType<typeof useForm<RewardsFormInput, unknown, RewardsFormValues>>;
  giveback: GivebackContext;
  pointsName: string;
  tierOptions: ReadonlyArray<{ value: string; label: string }>;
  /** False on the wizard, where the Base / VIP grouping already answers "who can redeem it". */
  showTierPicker?: boolean;
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

        <RewardAdvanced index={index} form={form} tierOptions={showTierPicker ? tierOptions : []} />
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
