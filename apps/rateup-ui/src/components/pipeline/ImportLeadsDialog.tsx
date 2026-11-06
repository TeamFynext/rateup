import { IconDownload, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { fetchImportTemplate, type LeadImportResult } from "@/backend/pipeline/pipeline.api.ts";
import type { LeadImportSkipReason } from "@/backend/pipeline/pipeline.api.ts";
import { useImportLeadsMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { PipelineDetail } from "@/backend/pipeline/pipeline.types.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import { usePipelineTypeConfig } from "./pipelineTypes.ts";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: PipelineDetail | undefined;
}

const ACCEPTED = ".csv,.xlsx,.ods";

/**
 * Uploads a spreadsheet onto the board. The template is built by the API from this board's
 * own columns and stage names, so a filled-in copy imports without edits. Rows that cannot
 * go in are listed afterwards by row number rather than failing the file.
 */
export function ImportLeadsDialog({
  open,
  onOpenChange,
  pipeline,
}: Readonly<ImportLeadsDialogProps>) {
  const { t } = useTranslation();
  const typeConfig = usePipelineTypeConfig(pipeline);
  const importLeads = useImportLeadsMutation();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<LeadImportResult | null>(null);
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setResult(null);
  }, [open]);

  const download = async (format: "csv" | "xlsx") => {
    if (!pipeline) return;
    setDownloading(format);
    try {
      downloadBlob(
        await fetchImportTemplate(pipeline.id, format),
        `${pipeline.name} import.${format}`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not download the template")));
    } finally {
      setDownloading(null);
    }
  };

  const submit = () => {
    if (!pipeline || !file) return;
    importLeads.mutate({ pipelineId: pipeline.id, file }, { onSuccess: setResult });
  };

  const columns = importColumns(t, typeConfig.features.source);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <IconFileSpreadsheet className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display font-extrabold">
                {t("Import from a spreadsheet")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "Upload a CSV or Excel file. Each row becomes a card on this board. Imported cards send no messages and run no automations.",
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {result ? (
          <ImportResult result={result} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-muted flex flex-col gap-3 rounded-lg p-3.5">
              <div>
                <p className="text-sm font-medium">{t("Start from the template")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("It already has this board's columns and stage names filled in.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void download("xlsx")}
                  loading={downloading === "xlsx"}
                >
                  <IconDownload data-icon="inline-start" />
                  {t("Excel template")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void download("csv")}
                  loading={downloading === "csv"}
                >
                  <IconDownload data-icon="inline-start" />
                  {t("CSV template")}
                </Button>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {columns.map((column) => (
                  <div key={column.name} className="contents">
                    <dt className="font-medium">{column.name}</dt>
                    <dd className="text-muted-foreground">{column.hint}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <Label htmlFor="pipeline-import-file">{t("File")}</Label>
              <Input
                id="pipeline-import-file"
                type="file"
                accept={ACCEPTED}
                className="mt-1.5"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-muted-foreground mt-1.5 text-xs">
                {t("CSV, XLSX or ODS, up to 1,000 rows.")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
              >
                {t("Import another file")}
              </Button>
              <Button onClick={() => onOpenChange(false)}>{t("Done")}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("Cancel")}
              </Button>
              <Button onClick={submit} disabled={!file} loading={importLeads.isPending}>
                <IconUpload data-icon="inline-start" />
                {t("Import")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportResult({ result }: Readonly<{ result: LeadImportResult }>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <AlertTitle>
          {t("{total, plural, one {# card added} other {# cards added}}", {
            total: result.created,
          })}
        </AlertTitle>
        {result.skipped.length > 0 ? (
          <AlertDescription>
            {t(
              "{total, plural, one {# row was} other {# rows were}} left out. Fix them in the file and import it again; rows already on the board are skipped.",
              { total: result.skipped.length },
            )}
          </AlertDescription>
        ) : null}
      </Alert>

      {result.skipped.length > 0 ? (
        <div className="max-h-64 overflow-y-auto overscroll-contain rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 font-semibold">{t("Row")}</th>
                <th className="px-3 py-2 font-semibold">{t("Name")}</th>
                <th className="px-3 py-2 font-semibold">{t("Problem")}</th>
              </tr>
            </thead>
            <tbody>
              {result.skipped.map((skip) => (
                <tr key={skip.row} className="border-t">
                  <td className="px-3 py-2 tabular-nums">{skip.row}</td>
                  <td className="max-w-32 truncate px-3 py-2">{skip.name || "—"}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {skipReasonLabel(t, skip.reason, skip.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function importColumns(t: TFunction, sales: boolean) {
  return [
    { name: t("Name"), hint: t("Required.") },
    {
      name: t("Phone"),
      hint: t(
        "With the country code, e.g. 919876543210. Links the card to that contact, adding them if they are new.",
      ),
    },
    { name: t("Email"), hint: t("Optional.") },
    ...(sales ? [{ name: t("Company"), hint: t("Optional.") }] : []),
    {
      name: t("Stage"),
      hint: t("A column name on this board. Blank puts it in the first column."),
    },
    ...(sales
      ? [
          {
            name: t("Source"),
            hint: t(
              "WhatsApp, Instagram, Messenger, Webchat, Survey, Referral, Loyalty or Manual.",
            ),
          },
        ]
      : []),
    { name: t("Assignee email"), hint: t("A teammate on this board's teams.") },
    ...(sales ? [{ name: t("Expected close"), hint: t("A date, e.g. 2026-10-31.") }] : []),
    { name: t("Note"), hint: t("Added as the card's first note.") },
  ];
}

function skipReasonLabel(t: TFunction, reason: LeadImportSkipReason, value?: string): string {
  switch (reason) {
    case "MISSING_NAME":
      return t("No name");
    case "INVALID_PHONE":
      return t("{value} is not a valid phone number with a country code", { value });
    case "INVALID_EMAIL":
      return t("{value} is not a valid email", { value });
    case "UNKNOWN_STAGE":
      return t("This board has no stage called {value}", { value });
    case "UNKNOWN_SOURCE":
      return t("{value} is not a source RateUp knows", { value });
    case "UNKNOWN_ASSIGNEE":
      return t("{value} is not on this board's teams", { value });
    case "INVALID_DATE":
      return t("{value} is not a date", { value });
    case "ALREADY_ON_BOARD":
      return t("Already on this board");
    case "FAILED":
      return t("Could not be saved");
  }
}
