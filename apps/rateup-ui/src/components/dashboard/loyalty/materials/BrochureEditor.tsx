import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconDownload, IconGift, IconPrinter } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { SavedOnboardingData } from "@/backend/loyalty/onboarding.api";
import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { formatPoints } from "../giveback/format.ts";
import { rewardGroupOf } from "../onboarding/rewardGroups.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { Brochure } from "../poster/Brochure.tsx";
import { useArtboardExport } from "../poster/usePosterExport.ts";
import { BrandSourceRow } from "./BrandSourceRow.tsx";
import {
  brochureRows,
  brochureTiers,
  defaultEarnLine,
  pointsLabelOf,
  type BrochureDesign,
  type LoyaltyMaterials,
} from "./materials.ts";

const brochureSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the brochure a title")
    .max(40, "Keep it under 40 characters"),
  tagline: z.string().trim().max(60, "Keep it under 60 characters"),
  earnLine: z.string().trim().max(40, "Keep it under 40 characters"),
  rewards: z.array(
    z.object({
      rewardId: z.string(),
      include: z.boolean(),
      blurb: z.string().trim().max(90, "Keep it under 90 characters"),
    }),
  ),
  terms: z.string().trim().max(240, "Keep the terms under 240 characters"),
  showPoweredBy: z.boolean(),
});

type BrochureFormValues = z.infer<typeof brochureSchema>;

/** The brochure is a touch narrower than the A6 QR card. */
const BROCHURE_WIDTH_MM = 90;

interface BrochureEditorProps {
  program: LoyaltyProgram;
  rewards: SavedOnboardingData["rewards"];
  rules: SavedOnboardingData["rules"];
  /** The saved ladder, so tier-only rewards are marked; empty when tiers are off. */
  tiers?: SavedOnboardingData["tiers"];
  joinKeyword: string;
  design: BrochureDesign;
  /** Folds this design into the whole materials document for saving. */
  compose: (brochure: BrochureDesign) => LoyaltyMaterials;
}

/**
 * The table-top rewards brochure: title, tagline and earn line, then one line per reward
 * with a tick to include it and a blurb the customer reads, and the terms. The card on the
 * right is what prints.
 */
export function BrochureEditor({
  program,
  rewards,
  rules,
  tiers = [],
  joinKeyword,
  design,
  compose,
}: Readonly<BrochureEditorProps>) {
  const { t } = useTranslation();
  const form = useForm<BrochureFormValues>({
    resolver: zodResolver(brochureSchema),
    defaultValues: design,
  });
  const { fields } = useFieldArray({ control: form.control, name: "rewards" });
  const update = useUpdateLoyaltyProgramMutation(program.id, () => form.reset(form.getValues()));

  const rewardById = new Map(rewards.map((reward) => [reward.id, reward] as const));
  const ladder = brochureTiers(tiers);
  const tierOf = (reward: SavedOnboardingData["rewards"][number] | undefined) => {
    if (!reward || ladder.length === 0) return undefined;
    return ladder.find((tier) => tier.id === rewardGroupOf(reward, ladder));
  };
  const suggestedEarnLine = defaultEarnLine({ program, rules, rewards, joinKeyword });

  const onSubmit = (values: BrochureFormValues) => {
    update.mutate({ materials: compose(values) });
  };

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-4">
        <Card className="border-border">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Title")}</FieldLabel>
                  <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="tagline"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Tagline")}</FieldLabel>
                  <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="earnLine"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-baseline justify-between gap-3">
                    <FieldLabel htmlFor={field.name}>{t("Earn line")}</FieldLabel>
                    {suggestedEarnLine && field.value !== suggestedEarnLine && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          form.setValue("earnLine", suggestedEarnLine, { shouldDirty: true })
                        }
                      >
                        {t("Reset to my earn rate")}
                      </Button>
                    )}
                  </div>
                  <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
                  <FieldDescription>
                    {t("Your default earning rule, the way customers say it.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <IconGift size={16} className="text-ru-blue-600 dark:text-ru-blue-300" />
              <p className="text-sm font-medium text-foreground">{t("Rewards on the card")}</p>
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No point rewards yet.")}{" "}
                <Link
                  to={LOYALTY_PATHS.program}
                  search={{ section: "rewards" }}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("Add rewards in Program › Rewards")}
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {fields.map((line, index) => {
                  const reward = rewardById.get(line.rewardId);
                  return (
                    <li key={line.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <Controller
                        control={form.control}
                        name={`rewards.${index}.include`}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                            aria-label={t("Include {name}", { name: reward?.name ?? "" })}
                          />
                        )}
                      />
                      <Badge variant="outline" className="shrink-0 font-mono">
                        {formatPoints(reward?.pointsCost ?? 0, program.currencyName)}
                      </Badge>
                      {tierOf(reward) && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 gap-1.5"
                          title={t("Only {name} members and above can redeem this", {
                            name: tierOf(reward)?.name ?? "",
                          })}
                        >
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            // The tier's own colour is data, hence the style prop.
                            style={{ backgroundColor: tierOf(reward)?.color }}
                          />
                          {t("{name}+", { name: tierOf(reward)?.name ?? "" })}
                        </Badge>
                      )}
                      <Controller
                        control={form.control}
                        name={`rewards.${index}.blurb`}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid} className="min-w-[200px] flex-1">
                            <Input
                              aria-label={t("What {name} says on the card", {
                                name: reward?.name ?? "",
                              })}
                              placeholder={reward?.name}
                              aria-invalid={fieldState.invalid}
                              className="h-8"
                              {...field}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            <Controller
              control={form.control}
              name="terms"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Terms & Conditions")}</FieldLabel>
                  <Textarea id={field.name} rows={3} aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="showPoweredBy"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">
                    {t("Show “powered by rateup”")}
                  </p>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          </CardContent>
        </Card>

        <BrandSourceRow program={program} />
      </div>

      <BrochurePreview
        control={form.control}
        program={program}
        rewards={rewards}
        tiers={tiers}
        isDirty={form.formState.isDirty}
        isSaving={update.isPending}
      />
    </form>
  );
}

function BrochurePreview({
  control,
  program,
  rewards,
  tiers,
  isDirty,
  isSaving,
}: Readonly<{
  control: Control<BrochureFormValues>;
  program: LoyaltyProgram;
  rewards: SavedOnboardingData["rewards"];
  tiers: SavedOnboardingData["tiers"];
  isDirty: boolean;
  isSaving: boolean;
}>) {
  const { t } = useTranslation();
  const values = useWatch({ control });
  const boardRef = useRef<HTMLDivElement>(null);
  const { exporting, exportSafe, download, print } = useArtboardExport(boardRef);
  const filename = `${program.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "loyalty"}-brochure.png`;

  const lines = (values.rewards ?? []).flatMap((line) =>
    line?.rewardId
      ? [{ rewardId: line.rewardId, include: line.include ?? true, blurb: line.blurb ?? "" }]
      : [],
  );

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4">
      <div className="flex justify-center overflow-x-auto rounded-xl bg-muted p-4 sm:p-6">
        <Brochure
          ref={boardRef}
          brandColor={program.brandColor ?? "#1c518e"}
          logoUrl={program.logoUrl}
          heroImageUrl={program.heroImageUrl}
          title={values.title ?? program.name}
          businessName={program.businessName ?? null}
          tagline={values.tagline ?? ""}
          earnLine={values.earnLine ?? ""}
          pointsLabel={pointsLabelOf(program.currencyName)}
          rows={brochureRows({ rewards: lines }, rewards, tiers)}
          tiers={brochureTiers(tiers)}
          currencyCode={program.currencyCode}
          currencySymbol={program.currencySymbol}
          qualificationWindowMonths={program.tierQualificationWindowMonths ?? null}
          terms={values.terms ?? ""}
          showPoweredBy={values.showPoweredBy ?? true}
          exportSafe={exportSafe}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="submit" disabled={!isDirty || isSaving}>
          <IconDeviceFloppy size={16} />
          {isSaving ? t("Saving…") : t("Save design")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => download(filename)}
          disabled={exporting}
        >
          <IconDownload size={16} />
          {exporting ? t("Preparing…") : t("Download")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => print(BROCHURE_WIDTH_MM)}
          disabled={exporting}
        >
          <IconPrinter size={16} />
          {t("Print")}
        </Button>
      </div>
    </div>
  );
}
