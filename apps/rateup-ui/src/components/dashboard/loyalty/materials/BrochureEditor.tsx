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
import { ColorField } from "@/components/common/color-field.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

import { formatPoints } from "../giveback/format.ts";
import { whatsappJoinUrl } from "../joinLink.ts";
import { DEFAULT_BRAND_COLOR } from "../onboarding/programDefaults.ts";
import { rewardGroupOf } from "../onboarding/rewardGroups.ts";
import { HEX_COLOUR } from "../onboarding/schemas.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { Brochure } from "../poster/Brochure.tsx";
import { usePosterExport } from "../poster/usePosterExport.ts";
import { BrandSourceRow } from "./BrandSourceRow.tsx";
import { BROCHURE_DESIGNS, brochureDesigns, type BrochureDesignKind } from "./brochureDesigns.ts";
import { BROCHURE_PAPERS, brochureTones, paperHex } from "./brochurePapers.ts";
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
  design: z.enum(BROCHURE_DESIGNS),
  background: z.string().regex(HEX_COLOUR, "Use a hex colour like #FFFDF8"),
  showQr: z.boolean(),
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
  /** The number the join QR opens a chat with; null when no channel is connected. */
  whatsappNumber: string | null;
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
  whatsappNumber,
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
  const brandColor = program.brandColor ?? DEFAULT_BRAND_COLOR;

  const onSubmit = (values: BrochureFormValues) => {
    update.mutate({ materials: compose(values) });
  };

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-4">
        <DesignGallery control={form.control} brandColor={brandColor} />

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
                  to={LOYALTY_PATHS.rewards}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("Add rewards in Rewards")}
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
              name="showQr"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t("Print the join QR")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Where it sits is up to the design you picked.")}
                    </p>
                  </div>
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
        whatsappNumber={whatsappNumber}
        joinKeyword={joinKeyword}
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
  whatsappNumber,
  joinKeyword,
  isDirty,
  isSaving,
}: Readonly<{
  control: Control<BrochureFormValues>;
  program: LoyaltyProgram;
  rewards: SavedOnboardingData["rewards"];
  tiers: SavedOnboardingData["tiers"];
  /** The number the QR opens a chat with; without one there is no code to print. */
  whatsappNumber: string | null;
  joinKeyword: string;
  isDirty: boolean;
  isSaving: boolean;
}>) {
  const { t } = useTranslation();
  const values = useWatch({ control });
  const brandColor = program.brandColor ?? DEFAULT_BRAND_COLOR;
  const boardRef = useRef<HTMLDivElement>(null);
  // The same hook the counter poster uses. An empty url leaves `qrDataUrl` null, which is
  // what a programme with no connected number gets — the toggle then has nothing to print
  // and the brochure simply omits the block.
  const joinUrl = whatsappNumber ? whatsappJoinUrl(whatsappNumber, joinKeyword) : "";
  const { qrDataUrl, exporting, exportSafe, download, print } = usePosterExport(joinUrl, boardRef);
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
          brandColor={brandColor}
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
          design={values.design ?? "menu"}
          background={values.background ?? paperHex("warm-white", brandColor)}
          showQr={values.showQr ?? false}
          qrDataUrl={qrDataUrl}
          joinKeyword={joinKeyword}
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

/**
 * Pick a design, then a paper.
 *
 * A gallery rather than a select because the choice is visual: each tile is a small
 * wireframe of the layout, so the difference between a menu card and a poster is visible
 * before committing. Every design carries the same copy, so trying one costs nothing.
 */
function DesignGallery({
  control,
  brandColor,
}: Readonly<{ control: Control<BrochureFormValues>; brandColor: string }>) {
  const { t } = useTranslation();
  const designs = brochureDesigns(t);
  // The retired paper presets, kept as the picker's starting points: every one resolves
  // through `brochureTones`, so a preset and the same hex typed by hand print alike.
  const presetSwatches = BROCHURE_PAPERS.map((paper) => paperHex(paper, brandColor));

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
        <Controller
          control={control}
          name="design"
          render={({ field }) => (
            <div className="flex flex-col gap-2.5">
              <p className="text-sm font-medium text-foreground">{t("Design")}</p>
              <div
                role="radiogroup"
                aria-label={t("Brochure design")}
                className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
              >
                {designs.map((meta) => {
                  const selected = field.value === meta.kind;
                  return (
                    <button
                      key={meta.kind}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(meta.kind)}
                      title={meta.description}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <DesignThumb kind={meta.kind} brandColor={brandColor} />
                      <span className="truncate text-xs font-semibold text-foreground">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {designs.find((meta) => meta.kind === field.value)?.description}
              </p>
            </div>
          )}
        />

        <Controller
          control={control}
          name="background"
          render={({ field, fieldState }) => {
            const tones = brochureTones(String(field.value ?? ""), brandColor);
            return (
              <div className="flex flex-col gap-2.5">
                <ColorField
                  id={field.name}
                  label={t("Background")}
                  value={String(field.value ?? "")}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  swatches={presetSwatches}
                  hint={t(
                    "Any colour. The text and the accents follow it, so a dark card prints light type.",
                  )}
                  invalid={fieldState.invalid}
                  error={fieldState.error}
                />
                {/* The chosen colour with the ink it will actually print — a colour that
                    would read badly cannot look fine in the picker. */}
                <p
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs"
                  style={{ backgroundColor: tones.paper, color: tones.inkMuted }}
                >
                  <span className="font-semibold" style={{ color: tones.ink }}>
                    {t("Aa")}
                  </span>{" "}
                  {t("body text")} ·{" "}
                  <span className="font-semibold" style={{ color: tones.accent }}>
                    {t("accents")}
                  </span>
                </p>
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}

/** A wireframe of one layout, small enough to read as a shape rather than a card. */
function DesignThumb({
  kind,
  brandColor,
}: Readonly<{ kind: BrochureDesignKind; brandColor: string }>) {
  const bar = "rounded-[2px] bg-foreground/15";
  const band = { backgroundColor: brandColor };

  return (
    <span
      aria-hidden
      className="flex h-[62px] w-full flex-col overflow-hidden rounded-[5px] border border-border bg-card"
    >
      {kind === "menu" && (
        <>
          <span className="flex h-[18px] items-center gap-1 px-1.5" style={band}>
            <span className="size-2.5 rounded-[2px] bg-white/85" />
            <span className="h-1 w-7 rounded-[1px] bg-white/70" />
          </span>
          <span className="flex flex-1 flex-col justify-center gap-[3px] px-1.5">
            <span className={`h-[3px] w-8 ${bar}`} />
            <span className={`h-[2px] w-full ${bar}`} />
            <span className={`h-[2px] w-full ${bar}`} />
            <span className={`h-[2px] w-2/3 ${bar}`} />
          </span>
        </>
      )}
      {kind === "poster" && (
        <>
          <span className="h-[30px]" style={band} />
          <span className="flex flex-1 flex-col justify-center gap-[3px] px-1.5">
            <span className={`h-[2px] w-full ${bar}`} />
            <span className={`h-[2px] w-full ${bar}`} />
            <span className={`h-[2px] w-1/2 ${bar}`} />
          </span>
        </>
      )}
      {kind === "tent" && (
        <span className="flex flex-1 flex-col gap-[3px] p-1.5">
          <span className="h-[3px] w-10 rounded-[1px]" style={band} />
          <span className="mt-0.5 flex gap-1">
            <span className="flex flex-1 flex-col gap-[2px]">
              <span className={`h-[2px] w-full ${bar}`} />
              <span className={`h-[2px] w-full ${bar}`} />
            </span>
            <span className="flex flex-1 flex-col gap-[2px]">
              <span className={`h-[2px] w-full ${bar}`} />
              <span className={`h-[2px] w-full ${bar}`} />
            </span>
          </span>
          <span className="mt-auto flex items-center gap-1">
            <span className="size-[15px] rounded-[2px] bg-foreground/25" />
            <span className={`h-[2px] w-6 ${bar}`} />
          </span>
        </span>
      )}
      {kind === "typeset" && (
        <span className="flex flex-1 flex-col items-center justify-center gap-[3px] px-2">
          <span className="h-[3px] w-12 rounded-[1px]" style={band} />
          <span className="h-px w-5 bg-foreground/25" />
          <span className={`mt-1 h-[2px] w-full ${bar}`} />
          <span className={`h-[2px] w-full ${bar}`} />
          <span className={`h-[2px] w-2/3 ${bar}`} />
        </span>
      )}
    </span>
  );
}
