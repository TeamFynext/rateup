import {
  IconAlertTriangle,
  IconDownload,
  IconFileSpreadsheet,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  ContactImportStarted,
  ContactImportStatus,
} from "@/backend/campaign/contacts/contacts.api";
import {
  useContactImportStatus,
  useImportCSVContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import type { CustomField } from "@/context/CustomFieldsContext.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorData } from "@/utils/apiError.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import ContactImportErrorModal from "./ContactImportErrorModal.tsx";

/** The subset of a react-query mutation over the import `FormData` that this dialog drives. */
export interface ContactImportMutation {
  mutate(
    data: FormData,
    options?: {
      onSuccess?: (res: { data: ContactImportStarted }) => void;
      onError?: (error: Error) => void;
      onSettled?: () => void;
    },
  ): void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Imports a CSV/XLSX/ODS file of contacts. By default into the org's contact list; pass
 * `importMutation` (and `groupId`) to import somewhere else, such as a group. A passed
 * mutation reports its own upload failures, so the dialog only does so for the default.
 *
 * The upload only validates and queues the file; the contacts are written by a background
 * job. The dialog follows that job — a progress bar, then a summary — and keeps following
 * it after being closed, so a long import still ends with a toast.
 */
const ImportContactsDialog = ({
  opened,
  setOpened,
  importMutation,
  groupId,
  description,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  importMutation?: ContactImportMutation;
  groupId?: string;
  description?: string;
}) => {
  const { t } = useTranslation();

  const handleDownloadDemo = () => {
    const fileUrl = getFileUrlFromKey("/File/contact/demo.csv", false);
    const link = document.createElement("a");
    link.href = fileUrl ?? "";
    link.download = "contacts-import.csv";
    link.click();
  };
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const defaultImportMutation = useImportCSVContactMutation();
  const importCSVContactMutation = importMutation ?? defaultImportMutation;
  const ownsFeedback = !importMutation;
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const { customFields } = useCustomFieldsContext();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: status } = useContactImportStatus(jobId, groupId);
  const finished = status?.state === "completed" || status?.state === "failed";
  // Bumped to (re)open the rejected-rows table from the summary.
  const [rejectedView, setRejectedView] = useState(0);

  // An import that finishes while the dialog is closed still has to be reported.
  const openedRef = useRef(opened);
  useEffect(() => {
    openedRef.current = opened;
  }, [opened]);
  useEffect(() => {
    if (!status || !finished || openedRef.current) return;
    if (status.state === "completed") toast.success(importSummaryLine(status, t));
    else toast.error(t("The contact import stopped before it finished."));
    setJobId(null);
  }, [status, finished, t]);

  useEffect(() => {
    if (csvfile) {
      const fileExtension = csvfile.name.split(".").pop()?.toLowerCase();
      if (!["csv", "xlsx", "ods"].includes(fileExtension ?? "")) {
        setError(t("Please upload a valid CSV, XLSX, or ODS file."));
      } else {
        setError(null);
      }
    }
  }, [csvfile, t]);
  function handleImportContacts() {
    if (!csvfile) {
      setError(t("Please select a CSV file to import."));
      return;
    }
    const formData = new FormData();
    formData.append("update", updateExisting ? "true" : "false");
    formData.append("hasHeaderRow", hasHeaderRow ? "true" : "false");
    formData.append("file", csvfile);
    fields.forEach((item, index) => {
      formData.append(`tags[${index}]`, item.slug);
    });
    importCSVContactMutation.mutate(formData, {
      onSettled: () => {
        setCsvfile(null);
      },
      onSuccess: (res) => {
        setJobId(res.data.jobId);
      },
      onError: (error) => {
        const isValidationError = getApiErrorData(error)?.error === "VALIDATION_ERR";
        if (ownsFeedback && !isValidationError) {
          toast.error(error?.message || "Importing failed");
        }
        setOpened(false);
      },
    });
  }

  function reset() {
    setCsvfile(null);
    setUpdateExisting(false);
    setHasHeaderRow(true);
    setError(null);
    // A running import is left to finish and report itself; only a finished one is cleared.
    if (finished) setJobId(null);
  }

  useEffect(() => {
    setFields(customFields);
  }, [customFields]);

  return (
    <Dialog
      open={opened}
      onOpenChange={(open) => {
        if (!open) reset();
        setOpened(open);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <IconFileSpreadsheet className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display font-extrabold">
                {t("Import contacts")}
              </DialogTitle>
              <DialogDescription>
                {description ??
                  t("Upload a CSV or Excel file. Each row becomes a contact in your list.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {jobId ? (
          <ImportProgress
            status={status}
            groupId={groupId}
            onShowRejected={() => setRejectedView((n) => n + 1)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-muted flex flex-col gap-3 rounded-lg p-3.5">
              <div>
                <p className="text-sm font-medium">{t("Start from the template")}</p>
                <p className="text-muted-foreground text-xs">
                  {t(
                    "The file needs a name and a phone column. Add a column for each custom field you tick below.",
                  )}
                </p>
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={handleDownloadDemo}>
                  <IconDownload data-icon="inline-start" />
                  {t("CSV template")}
                </Button>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="font-medium">{t("name")}</dt>
                <dd className="text-muted-foreground">{t("Required.")}</dd>
                <dt className="font-medium">{t("phone")}</dt>
                <dd className="text-muted-foreground">
                  {t("Required, with the country code, e.g. 919876543210.")}
                </dd>
              </dl>
            </div>

            {customFields.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t("Custom fields")}</p>
                <p className="text-muted-foreground mb-2 text-xs">
                  {t("Tick the ones your file has a column for.")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {customFields.map((field) => {
                    const checked = fields.some((p) => p.id === field.id);
                    return (
                      <label
                        key={field.id}
                        htmlFor={field.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          id={field.id}
                          onCheckedChange={(next) => {
                            setFields((prev) =>
                              next ? [...prev, field] : prev.filter((p) => p.id !== field.id),
                            );
                          }}
                        />
                        {field.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Field orientation="horizontal" className="gap-2">
                <Switch
                  id="update-existing-data"
                  checked={updateExisting}
                  onCheckedChange={setUpdateExisting}
                />
                <FieldLabel htmlFor="update-existing-data" className="font-normal">
                  {t("Update contacts that already exist")}
                </FieldLabel>
              </Field>
              <Field orientation="horizontal" className="gap-2">
                <Switch
                  id="has-header-row"
                  checked={hasHeaderRow}
                  onCheckedChange={setHasHeaderRow}
                />
                <FieldLabel htmlFor="has-header-row" className="font-normal">
                  {t("First row contains column headers (name, phone, ...)")}
                </FieldLabel>
              </Field>
            </div>

            <div>
              <Label htmlFor="contact-csv">{t("File")}</Label>
              <Input
                id="contact-csv"
                type="file"
                accept=".csv,.xlsx,.ods"
                className="mt-1.5"
                onChange={(e) => setCsvfile(e.target.files?.[0] || null)}
              />
              {error ? (
                <p className="text-destructive mt-1.5 text-xs">{error}</p>
              ) : (
                <p className="text-muted-foreground mt-1.5 text-xs">{t("CSV, XLSX or ODS.")}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {jobId ? (
            <DialogClose
              render={<Button variant={finished ? "default" : "ghost"} onClick={reset} />}
            >
              {finished ? t("Done") : t("Close")}
            </DialogClose>
          ) : (
            <>
              <DialogClose render={<Button variant="ghost" onClick={reset} />}>
                {t("Cancel")}
              </DialogClose>
              <Button
                onClick={handleImportContacts}
                disabled={!csvfile || Boolean(error)}
                loading={importCSVContactMutation.isPending}
              >
                <IconUpload data-icon="inline-start" />
                {t("Import")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
      <ContactImportErrorModal
        body={getApiErrorData(importCSVContactMutation?.error)}
        isError={importCSVContactMutation.isError}
      />
      {rejectedView > 0 && status && (
        <ContactImportErrorModal
          key={rejectedView}
          body={{ error: "VALIDATION_ERR", data: status.rejected }}
          isError
        />
      )}
    </Dialog>
  );
};

type Translate = ReturnType<typeof useTranslation>["t"];

const fmt = (n: number) => n.toLocaleString();

/** One sentence for the toast an import reports when the dialog is no longer open. */
function importSummaryLine(status: ContactImportStatus, t: Translate) {
  return t(
    "Contact import finished: {created} added, {updated} updated, {skipped} already in your list.",
    {
      created: fmt(status.created),
      updated: fmt(status.updated),
      skipped: fmt(status.skipped),
    },
  );
}

function ImportProgress({
  status,
  groupId,
  onShowRejected,
}: Readonly<{
  status: ContactImportStatus | undefined;
  groupId?: string;
  onShowRejected: () => void;
}>) {
  const { t } = useTranslation();

  if (!status || status.state === "queued" || status.state === "running") {
    const processed = status?.processed ?? 0;
    const total = status?.total ?? 0;
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          {status?.state === "running"
            ? t("Importing {processed} of {total} contacts…", {
                processed: fmt(processed),
                total: fmt(total),
              })
            : t("Waiting to start…")}
        </p>
        <Progress value={total ? Math.round((processed / total) * 100) : null} />
        <p className="text-muted-foreground text-xs">
          {t("You can close this window. The import keeps running and tells you when it is done.")}
        </p>
      </div>
    );
  }

  if (status.state === "failed") {
    return (
      <Alert variant="destructive">
        <IconAlertTriangle />
        <AlertTitle>{t("The import stopped before it finished")}</AlertTitle>
        <AlertDescription>
          {t(
            "{processed} of {total} rows were saved before it stopped. Import the file again to add the rest. Contacts already saved are skipped.",
            { processed: fmt(status.processed), total: fmt(status.total) },
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const rows: { label: string; value: number }[] = [
    { label: t("Added"), value: status.created },
    { label: t("Updated"), value: status.updated },
    { label: t("Already in your list, left unchanged"), value: status.skipped },
    ...(groupId ? [{ label: t("Added to this group"), value: status.addedToGroup }] : []),
    { label: t("Repeated in the file, imported once"), value: status.duplicateCount },
    { label: t("Rejected"), value: status.rejectedCount },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{t("Import finished")}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-medium tabular-nums">{fmt(row.value)}</dd>
          </div>
        ))}
      </dl>
      {status.skipped > 0 && (
        <p className="text-muted-foreground text-xs">
          {t(
            "To change contacts that already exist, import again with “Update contacts that already exist” turned on.",
          )}
        </p>
      )}
      {status.rejected.length > 0 && (
        <div>
          <Button variant="outline" size="sm" onClick={onShowRejected}>
            {t("View rejected rows")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ImportContactsDialog;
