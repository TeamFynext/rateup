import {
  IconActivity,
  IconBan,
  IconBolt,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconDownload,
  IconFileSpreadsheet,
  IconFolder,
  IconGlobe,
  IconPlus,
  IconSearch,
  IconStack2,
  IconTag,
  IconTrash,
  IconUpload,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useContactLabels,
  useDeleteManyContactsMutation,
  useExportContactsMutation,
  useImportCSVContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import AddToGroupModal from "@/components/Contacts/AddToGroupModal.tsx";
import ApplyLifecycletoContactsModal from "@/components/Contacts/ApplyLifecycletoContactsModal.tsx";
import AssignStageToContactsModal from "@/components/Contacts/AssignStageToContactsModal.tsx";
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal.tsx";
import CreateOrEditContactModal from "@/components/Contacts/CreatOrEditContactModal.tsx";
import LabelContactModal from "@/components/Contacts/LabelContactModal.tsx";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector.tsx";
import { StageSelector, usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import type { CustomField } from "@/context/CustomFieldsContext.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import { cn } from "@/lib/utils.ts";
import { TeamFeature } from "@/types/enums.ts";
import { getApiErrorData } from "@/utils/apiError.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { useContactTableStore } from "../store/contact-table-store.ts";

interface DataTableToolbarProps {
  table: Table<ContactsData>;
}

const SourceSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const ContactSources = [
    { label: "All Sources", value: "all", icon: IconStack2 },
    { label: "WhatsApp", value: "whatsapp", icon: IconBrandWhatsapp },
    { label: "Instagram", value: "instagram", icon: IconBrandInstagram },
    { label: "Web", value: "WEBCHAT", icon: IconGlobe },
    { label: "Manual", value: "manual", icon: IconUserPlus },
    { label: "Imported", value: "csv import", icon: IconUpload },
  ];
  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value ?? "")}
      items={ContactSources.map((source) => ({ value: source.value, label: source.label }))}
    >
      <SelectTrigger className="w-37.5 bg-muted border-none">
        <span className="text-sm">
          <SelectValue placeholder="Select Source" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {ContactSources.map((source) => (
          <SelectItem key={source.value} value={source.value}>
            <div className="flex items-center">
              <source.icon className="mr-2" />
              <span>{source.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const LabelSelector = ({
  value,
  onChange,
  includeAll = false,
  includeStatus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  includeStatus?: boolean;
}) => {
  const { data: contactLabels = [], isPending: isPendingContactLabels } = useContactLabels();
  const labels = contactLabels.map((label) => ({
    id: label.id,
    name: label.name,
    icon: IconTag,
  }));
  if (includeAll) {
    labels.unshift({
      id: "all",
      name: "All Contacts",
      icon: IconUsers,
    });
  }
  if (includeStatus) {
    labels.push(
      { id: "active", name: "Active", icon: IconBolt },
      { id: "blocked", name: "Blocked", icon: IconBan },
    );
  }
  if (isPendingContactLabels) {
    return <Skeleton className="h-4 w-37.5" />;
  }

  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value ?? "")}
      items={labels.map((label) => ({ value: label.id, label: label.name }))}
    >
      <SelectTrigger className="w-37.5 bg-muted border-none">
        <span className="text-sm">
          <SelectValue placeholder="Select Label" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {labels.map((label) => (
          <SelectItem key={label.id} value={label.id}>
            <div className="flex items-center">
              <label.icon className="mr-2" />
              <span>{label.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export function DataTableToolbar({ table }: Readonly<DataTableToolbarProps>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { filter, setFilter } = useContactTableStore();
  const { t } = useTranslation();

  const [isOpenedAddContactModal, setIsOpenedAddContactModal] = useState(false);

  const [openAddtoGroupModal, setOpenAddtoGroupModal] = useState(false);
  const [openLabelContactModal, setOpenLabelContactModal] = useState(false);
  const [openLifecycleContactModal, setOpenLifecycleContactModal] = useState(false);
  const [openStageContactModal, setOpenStageContactModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  // The bulk action follows whichever vocabulary the org actually has. Pipeline
  // orgs assign a stage; the rest keep the lifecycle action until the pipeline
  // reaches them, so nobody loses the bulk write in the meantime.
  const { allowedFeatures } = useTeamFeatures();
  const hasPipeline = allowedFeatures === null || allowedFeatures.has(TeamFeature.Pipeline);
  // Whether the org has columns to filter by, which is stricter than having the
  // feature — see the note on the filter itself.
  const hasBoard = usePipelineStages().length > 0;

  const deleteManyContactsMutation = useDeleteManyContactsMutation();
  const confirm = useConfirm();
  async function handleDeleteContacts() {
    const shouldDelete = await confirm({
      title: t("Delete contact"),
      description: t("Are you sure to delete these selected contacts?"),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) {
      table.setRowSelection({});
      return;
    }

    const selectedIds = Object.keys(table.getState().rowSelection);
    deleteManyContactsMutation?.mutate(selectedIds, {
      onSuccess: () => {
        toast.success("contact deleted successfully");
        resetRowSelection();
      },
      onError: (error) => {
        toast.error(error?.message || "Error deleting contacts");
      },
    });
  }

  function resetRowSelection() {
    table.setRowSelection({});
  }

  return (
    <Card className="p-2 mb-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                className="pl-10 placeholder:text-sm bg-muted border-none"
                value={filter.searchTerm}
                onChange={(event) =>
                  setFilter({
                    ...filter,
                    searchTerm: event.currentTarget.value?.trimStart()?.replaceAll("+", ""),
                  })
                }
              />
            </div>
            {/* Matches the table's Stage column, which swaps on the same test:
                filtering by lifecycle while reading a Lead stage column was
                the same screen speaking two vocabularies. Keyed on the board
                existing rather than on the feature flag, because `StageSelector`
                renders nothing without columns — a team with the feature but no
                board would otherwise be left with no filter at all. */}
            {hasBoard ? (
              <StageSelector
                all
                className="w-48"
                value={filter?.stageId}
                onChange={(value) => setFilter({ ...filter, stageId: value })}
              />
            ) : (
              <LifecycleSelector
                all={true}
                className="w-48"
                value={filter?.lifecycleId}
                onChange={(value, _lifecycleObj) => setFilter({ ...filter, lifecycleId: value })}
              />
            )}
            <LabelSelector
              value={filter.labelId}
              onChange={(value) => setFilter({ ...filter, labelId: value })}
              includeAll
              includeStatus
            />
            <SourceSelector
              value={filter.source}
              onChange={(value) => setFilter({ ...filter, source: value })}
            />
            <Button
              variant="default"
              className="bg-primary"
              size="sm"
              onClick={() => setIsOpenedAddContactModal(true)}
            >
              <IconPlus className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm">Add Contact</span>
            </Button>
            <ExportContacts table={table} />

            <Button variant="outline" size="sm" onClick={() => setOpenImportModal(true)}>
              <IconUpload className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm">{t("Import")}</span>
            </Button>
            <ImportContactModal opened={openImportModal} setOpened={setOpenImportModal} />
            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
                Reset
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DataTableViewOptions table={table} />
          </div>
        </div>
        {Object.keys(table.getState().rowSelection).length > 0 && (
          <div className="flex items-center gap-2 justify-center">
            <span className="text-sm text-muted-foreground">
              {Object.keys(table.getState().rowSelection).length} Selected
            </span>
            <Button
              variant="outline"
              className="hover:text-blue-500"
              onClick={() => setOpenAddtoGroupModal(true)}
            >
              <IconFolder />
              <span>{t("Add to Group")}</span>
            </Button>
            <Button
              variant="outline"
              className="hover:text-blue-500"
              onClick={() => setOpenLabelContactModal(true)}
            >
              <IconTag />
              <span>{t("Apply Label")}</span>
            </Button>
            <Button
              variant="outline"
              className="hover:text-blue-500"
              onClick={() =>
                hasPipeline ? setOpenStageContactModal(true) : setOpenLifecycleContactModal(true)
              }
            >
              <IconActivity />
              <span>{hasPipeline ? t("Update lead stage") : t("Update Lifecycle Stage")}</span>
            </Button>
            <Button
              variant="outline"
              className="hover:text-destructive"
              onClick={handleDeleteContacts}
            >
              <IconTrash />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        )}
      </div>
      <CreateOrEditContactModal
        opened={isOpenedAddContactModal}
        setOpened={setIsOpenedAddContactModal}
      />
      <AddToGroupModal
        opened={openAddtoGroupModal}
        selectedContactIds={Object.keys(table.getState().rowSelection)}
        setOpened={setOpenAddtoGroupModal}
        onSuccess={resetRowSelection}
      />
      <LabelContactModal
        contactIds={Object.keys(table.getState().rowSelection)}
        opened={openLabelContactModal}
        setOpened={setOpenLabelContactModal}
        onSuccess={resetRowSelection}
      />
      <ApplyLifecycletoContactsModal
        contactIds={Object.keys(table.getState().rowSelection)}
        opened={openLifecycleContactModal}
        setOpened={setOpenLifecycleContactModal}
        onSuccess={resetRowSelection}
      />
      <AssignStageToContactsModal
        contactIds={Object.keys(table.getState().rowSelection)}
        opened={openStageContactModal}
        setOpened={setOpenStageContactModal}
        onSuccess={resetRowSelection}
      />
    </Card>
  );
}

const ExportContacts = ({ table }: { table: Table<ContactsData> }) => {
  const exportMut = useExportContactsMutation();
  const leafColumns = table
    .getAllLeafColumns()
    ?.filter((column) => column.getIsVisible() && !["select", "action"].includes(column.id))
    ?.map((col) => col.id);

  const handleExport = (format: "xlsx" | "ods") => {
    if (!leafColumns?.length) {
      toast.error("Please select at least one field to export.");
      return;
    }
    exportMut.mutate({
      format,
      fields: leafColumns,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <IconDownload className="w-4 h-4 mr-2" />
        <span className="font-medium text-sm">Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>Download as Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("ods")}>
          Download as OpenDocument (ODS)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ImportContactModal = ({
  opened,
  setOpened,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
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
  const importCSVContactMutation = useImportCSVContactMutation();
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
        toast.success("Contact imported successfully");
        setOpened(false);
      },
      onError: (error) => {
        const isValidationError = getApiErrorData(error)?.error === "VALIDATION_ERR";
        if (!isValidationError) {
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
                {t("Upload a CSV or Excel file. Each row becomes a contact in your list.")}
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
