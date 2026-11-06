import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconDownload, IconPrinter } from "@tabler/icons-react";
import { useRef } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import { CopyButton } from "@/components/common/copy-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { formatWhatsappNumber, whatsappJoinUrl } from "../joinLink.ts";
import { ConnectWhatsappCard } from "../poster/ConnectWhatsappCard.tsx";
import { QrPoster } from "../poster/QrPoster.tsx";
import { A6_WIDTH_MM, usePosterExport } from "../poster/usePosterExport.ts";
import { BrandSourceRow } from "./BrandSourceRow.tsx";
import type { LoyaltyMaterials, QrCardDesign } from "./materials.ts";

const qrCardSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(1, "Give the card a headline")
    .max(60, "Keep it under 60 characters"),
  subline: z.string().trim().max(80, "Keep it under 80 characters"),
  footnote: z.string().trim().max(60, "Keep it under 60 characters"),
  showHero: z.boolean(),
});

type QrCardFormValues = z.infer<typeof qrCardSchema>;

interface QrCardEditorProps {
  program: LoyaltyProgram;
  design: QrCardDesign;
  /** Folds this card's design into the whole materials document for saving. */
  compose: (qr: QrCardDesign) => LoyaltyMaterials;
  whatsappNumber: string | null;
  joinKeyword: string;
}

/**
 * The counter QR card: copy on the left, the card as it will print on the right. The QR
 * itself is the WhatsApp join link, so without a connected number the editor steps aside
 * for the Connect card.
 */
export function QrCardEditor({
  program,
  design,
  compose,
  whatsappNumber,
  joinKeyword,
}: Readonly<QrCardEditorProps>) {
  const { t } = useTranslation();
  const form = useForm<QrCardFormValues>({
    resolver: zodResolver(qrCardSchema),
    defaultValues: design,
  });
  // Saving re-baselines the form on what was just saved, so "Save design" goes quiet.
  const update = useUpdateLoyaltyProgramMutation(program.id, () => form.reset(form.getValues()));

  if (!whatsappNumber) {
    return <ConnectWhatsappCard joinKeyword={joinKeyword} />;
  }

  const url = whatsappJoinUrl(whatsappNumber, joinKeyword);
  const onSubmit = (values: QrCardFormValues) => {
    update.mutate({ materials: compose(values) });
  };

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_460px]"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-4">
        <Card className="border-border">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            <Controller
              control={form.control}
              name="headline"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Headline")}</FieldLabel>
                  <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="subline"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Promise")}</FieldLabel>
                  <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
                  <FieldDescription>{t("The coloured pill under the headline.")}</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="footnote"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Under the code")}</FieldLabel>
                  <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
                  <FieldDescription>
                    {t("Scanning opens WhatsApp with “{keyword}” ready to send.", {
                      keyword: joinKeyword,
                    })}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="showHero"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("Show hero photo")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Off, the band is your brand colour.")}
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

      <QrCardPreview
        control={form.control}
        program={program}
        url={url}
        caption={formatWhatsappNumber(whatsappNumber)}
        joinKeyword={joinKeyword}
        isDirty={form.formState.isDirty}
        isSaving={update.isPending}
      />
    </form>
  );
}

function QrCardPreview({
  control,
  program,
  url,
  caption,
  joinKeyword,
  isDirty,
  isSaving,
}: Readonly<{
  control: Control<QrCardFormValues>;
  program: LoyaltyProgram;
  url: string;
  caption: string;
  joinKeyword: string;
  isDirty: boolean;
  isSaving: boolean;
}>) {
  const { t } = useTranslation();
  const values = useWatch({ control });
  const posterRef = useRef<HTMLDivElement>(null);
  const { qrDataUrl, exporting, exportSafe, download, print } = usePosterExport(url, posterRef);
  const filename = `${program.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "loyalty"}-join-card.png`;

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4">
      <div className="flex justify-center overflow-x-auto rounded-xl bg-muted p-4 sm:p-6">
        <QrPoster
          ref={posterRef}
          venueName={program.businessName ?? program.name}
          programName={program.name}
          pointsName={program.currencyName}
          brandColor={program.brandColor ?? "#1c518e"}
          logoUrl={program.logoUrl}
          heroImageUrl={program.heroImageUrl}
          caption={caption}
          joinKeyword={joinKeyword}
          qrDataUrl={qrDataUrl}
          exportSafe={exportSafe}
          headline={values.headline}
          subline={values.subline}
          footnote={values.footnote}
          showHero={values.showHero ?? true}
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
          disabled={exporting || !qrDataUrl}
        >
          <IconDownload size={16} />
          {exporting ? t("Preparing…") : t("Download")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => print(A6_WIDTH_MM)}
          disabled={exporting || !qrDataUrl}
        >
          <IconPrinter size={16} />
          {t("Print")}
        </Button>
        <CopyButton
          variant="ghost"
          value={url}
          label={t("Copy WhatsApp join link")}
          toastMessage={t("WhatsApp join link copied")}
        />
      </div>
    </div>
  );
}
