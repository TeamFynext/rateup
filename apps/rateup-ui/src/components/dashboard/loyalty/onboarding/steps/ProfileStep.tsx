import { zodResolver } from "@hookform/resolvers/zod";
import { IconBuildingStore, IconPalette, IconSparkles } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyPreset, LoyaltyPresetKey } from "@/backend/loyalty/onboarding.api";
import TimeZoneSelector from "@/components/common/time-zone-selector.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { cn } from "@/lib/utils.ts";

import { BrandColorField } from "../parts/BrandColorField.tsx";
import { BrandPreviewCard } from "../parts/BrandPreviewCard.tsx";
import { ImageUploadTile } from "../parts/ImageUploadTile.tsx";
import { profileFormSchema, type ProfileFormInput, type ProfileFormValues } from "../schemas.ts";
import {
  SectionActions,
  SectionHeading,
  StepFooter,
  StepHeader,
  StepLayout,
  useBlockedSubmitNotice,
  useStepFooterProps,
  type StepMode,
} from "../StepChrome.tsx";

interface ProfileStepProps {
  defaultValues: ProfileFormInput;
  isSaving: boolean;
  /** For the live preview card; the name itself is edited on the earning step. */
  pointsName: string;
  mode?: StepMode;
  /**
   * The business-type picker. The wizard passes all three; the Program page's section
   * editor passes none — a live programme has already been seeded, and swapping the pack
   * would only change what the picker on Rewards suggests.
   */
  presets?: LoyaltyPreset[];
  selectedPresetKey?: LoyaltyPresetKey;
  onSelectPreset?: (key: LoyaltyPresetKey) => void;
  onCancel?: () => void;
  onSubmit: (values: ProfileFormValues) => void;
}

/**
 * Venue & branding: who the business is, and the assets a join page, poster or wallet
 * pass is drawn from. Strictly operational — nothing here is a decision
 * about points; those start on the next step.
 */
export function ProfileStep({
  defaultValues,
  isSaving,
  pointsName,
  mode = "wizard",
  presets,
  selectedPresetKey,
  onSelectPreset,
  onCancel,
  onSubmit,
}: Readonly<ProfileStepProps>) {
  const { t } = useTranslation();

  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  const showPicker = mode === "wizard" && Boolean(presets?.length) && Boolean(onSelectPreset);

  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onCancel });
  const reportBlockedSubmit = useBlockedSubmitNotice();

  /**
   * On the Program page each card ends with its own Save, so there is no row under the
   * form at all — the fields and the button that keeps them stay together as you scroll,
   * which is what the pinned row was reaching for. The wizard keeps Back / Continue: there
   * the step is one move in a sequence, not two independent-looking panels.
   */
  const cardActions =
    mode === "section" ? (
      <SectionActions
        isSaving={isSaving}
        submitLabel={footer.submitLabel}
        secondaryAction={footer.secondaryAction}
      />
    ) : null;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(onSubmit, reportBlockedSubmit)}
    >
      <StepHeader
        icon={<IconBuildingStore />}
        tone="blue"
        title={t("Your venue")}
        description={t(
          "Two minutes: the business details customers see, and the logo and colour everything is branded with.",
        )}
      />

      {/* The live "how it looks" preview is a wizard aid; on the Program page the
          finished pieces are previewed and printed on Materials instead. */}
      <StepLayout
        mode={mode}
        aside={
          mode === "wizard" ? (
            <BrandPreviewCard control={form.control} pointsName={pointsName} />
          ) : null
        }
      >
        <div className="flex flex-col gap-6">
          {/* ── Kind of business ── */}
          {showPicker && (
            <Card className="border-border">
              <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                <SectionHeading
                  icon={<IconSparkles />}
                  tone="blue"
                  title={t("What kind of business is this?")}
                  description={t(
                    "We'll suggest points, rewards and messages that suit it. You can change every one of them.",
                  )}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {presets?.map((preset) => {
                    const isSelected = preset.key === selectedPresetKey;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectPreset?.(preset.key)}
                        className={cn(
                          "flex h-full w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <span className="text-sm font-semibold text-foreground">
                          {t(preset.label)}
                        </span>
                        <span className="text-xs leading-relaxed text-muted-foreground">
                          {t(preset.description)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Business details ── */}
          <Card className="border-border">
            <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
              <SectionHeading
                icon={<IconBuildingStore />}
                tone="blue"
                title={t("Business details")}
                description={t("Where you trade, and who to reach about the program.")}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="businessName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Your business name")}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        className="h-9"
                        aria-invalid={fieldState.invalid}
                        placeholder={t("Kettle & Co")}
                        {...field}
                      />
                      <FieldDescription className="text-xs">
                        {t("Who the program belongs to — shown on the QR poster.")}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Your loyalty program name")}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        className="h-9"
                        aria-invalid={fieldState.invalid}
                        placeholder={t("Kettle Rewards")}
                        {...field}
                      />
                      <FieldDescription className="text-xs">
                        {t("What customers join — on the join page and in every WhatsApp message.")}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="contactName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Primary contact")}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        className="h-9"
                        placeholder={t("Who runs the program")}
                        {...field}
                        value={field.value ?? ""}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="contactPhone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Contact phone")}
                      </FieldLabel>
                      <PhoneInput
                        id={field.name}
                        defaultCountry="IN"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="contactEmail"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Contact email")}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        type="email"
                        className="h-9"
                        placeholder="name@example.com"
                        aria-invalid={fieldState.invalid}
                        {...field}
                        value={field.value ?? ""}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="currencyCode"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Currency")}
                      </FieldLabel>
                      <CurrencySelect
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        // The symbol is a separate column, so it has to be kept in step
                        // with the code rather than derived at render time.
                        onCurrencySelect={(currency) =>
                          form.setValue("currencySymbol", currency.symbol ?? currency.code)
                        }
                        placeholder={t("Select currency")}
                        currencies="all"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="timezone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Time zone")}
                      </FieldLabel>
                      <TimeZoneSelector value={field.value} onChange={field.onChange} />
                      <FieldDescription className="text-xs">
                        {t("Sets when birthday and reminder messages go out.")}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {cardActions}
            </CardContent>
          </Card>

          {/* ── Branding assets ── */}
          <Card className="border-border">
            <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
              <SectionHeading
                icon={<IconPalette />}
                tone="blue"
                title={t("Branding assets")}
                description={t(
                  "Used on the join page and the QR poster now, and for wallet passes and web widgets later.",
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="logoUrl"
                  render={({ field, fieldState }) => (
                    <ImageUploadTile
                      id={field.name}
                      label={t("Logo")}
                      hint={t("Square works best. PNG, JPG, WebP or SVG, up to 5 MB.")}
                      value={field.value}
                      onChange={field.onChange}
                      aspect="square"
                      invalid={fieldState.invalid}
                      error={fieldState.error}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="brandColor"
                  render={({ field, fieldState }) => (
                    <BrandColorField
                      id={field.name}
                      label={t("Brand colour")}
                      value={String(field.value ?? "")}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      hint={t("Buttons, the member badge and the poster band take this colour.")}
                      invalid={fieldState.invalid}
                      error={fieldState.error}
                    />
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="heroImageUrl"
                render={({ field, fieldState }) => (
                  <ImageUploadTile
                    id={field.name}
                    label={t("Hero image")}
                    hint={t(
                      "A wide photo of your place or product. Optional — without one, your brand colour fills the band.",
                    )}
                    value={field.value}
                    onChange={field.onChange}
                    aspect="wide"
                    accept="image/png,image/jpeg,image/webp"
                    invalid={fieldState.invalid}
                    error={fieldState.error}
                  />
                )}
              />

              {cardActions}
            </CardContent>
          </Card>
        </div>
      </StepLayout>

      {mode === "wizard" && <StepFooter isSaving={isSaving} {...footer} />}
    </form>
  );
}
