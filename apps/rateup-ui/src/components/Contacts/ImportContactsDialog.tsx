import { IconDownload, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useImportCSVContactMutation } from "@/backend/campaign/contacts/contacts.query";
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
    options?: { onSuccess?: () => void; onError?: (error: Error) => void; onSettled?: () => void },
  ): void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Imports a CSV/XLSX/ODS file of contacts. By default into the org's contact list; pass
 * `importMutation` to import somewhere else, such as a group. A passed mutation reports its
 * own success and failure toasts, so the dialog only does so for the default.
 */
const ImportContactsDialog = ({
  opened,
  setOpened,
  importMutation,
  description,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  importMutation?: ContactImportMutation;
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
      onSuccess: () => {
        if (ownsFeedback) toast.success("Contact imported successfully");
        setOpened(false);
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
      <ContactImportErrorModal
        body={getApiErrorData(importCSVContactMutation?.error)}
        isError={importCSVContactMutation.isError}
      />
    </Dialog>
  );
};

export default ImportContactsDialog;
