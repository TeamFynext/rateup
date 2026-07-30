import { IconBrandInstagram, IconBrandWhatsapp } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import {
  Activity,
  Ban,
  Download,
  Folder,
  Globe,
  Info,
  Layers,
  Plus,
  Search,
  Tag,
  Trash,
  Upload,
  UserRoundPlus,
  Users,
  Zap,
} from "lucide-react";
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
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal.tsx";
import CreateOrEditContactModal from "@/components/Contacts/CreatOrEditContactModal.tsx";
import LabelContactModal from "@/components/Contacts/LabelContactModal.tsx";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector.tsx";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
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
    { label: "All Sources", value: "all", icon: Layers },
    { label: "WhatsApp", value: "whatsapp", icon: IconBrandWhatsapp },
    { label: "Instagram", value: "instagram", icon: IconBrandInstagram },
    { label: "Web", value: "WEBCHAT", icon: Globe },
    { label: "Manual", value: "manual", icon: UserRoundPlus },
    { label: "Imported", value: "csv import", icon: Upload },
  ];
  return (
    <Select
      value={value}
      onValueChange={onChange}
      items={ContactSources.map((source) => ({ value: source.value, label: source.label }))}
    >
      <SelectTrigger className="w-37.5 bg-gray-100 border-none">
        <span className="text-sm ">
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
    icon: Tag,
  }));
  if (includeAll) {
    labels.unshift({
      id: "all",
      name: "All Contacts",
      icon: Users,
    });
  }
  if (includeStatus) {
    labels.push(
      { id: "active", name: "Active", icon: Zap },
      { id: "blocked", name: "Blocked", icon: Ban },
    );
  }
  if (isPendingContactLabels) {
    return <Skeleton className="h-4 w-37.5" />;
  }

  return (
    <Select
      value={value}
      onValueChange={onChange}
      items={labels.map((label) => ({ value: label.id, label: label.name }))}
    >
      <SelectTrigger className="w-37.5 bg-gray-100 border-none">
        <span className="text-sm ">
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
  const [openImportModal, setOpenImportModal] = useState(false);
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                className="pl-10 placeholder:text-sm bg-gray-100 border-none"
                value={filter.searchTerm}
                onChange={(event) =>
                  setFilter({
                    ...filter,
                    searchTerm: event.currentTarget.value?.trimStart()?.replaceAll("+", ""),
                  })
                }
              />
            </div>
            <LifecycleSelector
              all={true}
              className="w-48"
              value={filter?.lifecycleId}
              onChange={(value, _lifecycleObj) => setFilter({ ...filter, lifecycleId: value })}
            />
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
              <Plus className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm">Add Contact</span>
            </Button>
            <ExportContacts table={table} />

            <Button variant="outline" size="sm" onClick={() => setOpenImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
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
              <Folder />
              <span>{t("Add to Group")}</span>
            </Button>
            <Button
              variant="outline"
              className="hover:text-blue-500"
              onClick={() => setOpenLabelContactModal(true)}
            >
              <Tag />
              <span>{t("Apply Label")}</span>
            </Button>
            <Button
              variant="outline"
              className="hover:text-blue-500"
              onClick={() => setOpenLifecycleContactModal(true)}
            >
              <Activity />
              <span>{t("Update Lifecycle Stage")}</span>
            </Button>
            <Button variant="outline" className="hover:text-red-500" onClick={handleDeleteContacts}>
              <Trash />
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
        <Download className="w-4 h-4 mr-2" />
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
    // Example: download a text file (you can replace this with any file URL)
    const fileUrl = getFileUrlFromKey("/File/contact/demo.csv", false);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = "example.pdf"; // Suggested filename
    link.click();
  };
  const [csvfile, setCsvfile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const importCSVContactMutation = useImportCSVContactMutation();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState([]);
  const { customFields } = useCustomFieldsContext();

  useEffect(() => {
    if (csvfile) {
      const fileExtension = csvfile.name.split(".").pop()?.toLowerCase();
      if (!["csv", "xlsx", "ods"].includes(fileExtension)) {
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
      onError: (error: any) => {
        const isValidationError = error?.response?.data?.error === "VALIDATION_ERR";
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
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-md">{t("Import Contacts")}</DialogTitle>
          <DialogDescription>
            {t("Import contacts from a CSV file to add them to your contact list.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm">{t("Custom Fields")}</p>
          <Field>
            {customFields.map((field) => (
              <Field
                key={field.id}
                orientation="horizontal"
                className="rounded-lg bg-blue-100 p-1 w-fit px-2"
              >
                <Checkbox
                  checked={fields.some((p) => p.id === field.id)}
                  id={field.id}
                  className="rounded-xl data-[state=unchecked]:bg-gray-200"
                  onCheckedChange={(checked) => {
                    setFields((prev) =>
                      checked ? [...prev, field] : prev.filter((p) => p.id !== field.id),
                    );
                  }}
                />
                <FieldLabel htmlFor={field.id} className="text-sm font-normal">
                  {field.name}
                </FieldLabel>
              </Field>
            ))}
          </Field>

          <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 flex flex-col gap-2">
            <div className="flex gap-2 text-blue-700 text-sm">
              <Info />
              {t(
                "Utilizing CSV/XLSX file uploads to generate contact requires specific fields in the file: name, phone",
              )}
            </div>

            <Button variant="secondary" onClick={handleDownloadDemo}>
              <Upload />
              <span className="font-medium text-sm">{t("Download Demo Csv File")}</span>
            </Button>
          </blockquote>
          <Field orientation="horizontal" className="gap-2 mt-4">
            <Switch
              id="update-existing-data"
              className="data-[state=unchecked]:bg-gray-400"
              checked={updateExisting}
              onCheckedChange={setUpdateExisting}
            />
            <FieldLabel htmlFor="update-existing-data">
              {t("Update the existing data while importing")}
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" className="gap-2 mt-4">
            <Switch
              id="has-header-row"
              className="data-[state=unchecked]:bg-gray-400"
              checked={hasHeaderRow}
              onCheckedChange={setHasHeaderRow}
            />
            <FieldLabel htmlFor="has-header-row">
              {t("First row contains column headers (name, phone, ...)")}
            </FieldLabel>
          </Field>
          <div className="grid items-center gap-3 mt-4">
            <Input
              id="contact-csv"
              type="file"
              accept=".csv,.xlsx,.ods"
              onChange={(e) => setCsvfile(e.target.files?.[0] || null)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 mt-6 text-sm">
            <DialogClose render={<Button variant="secondary" onClick={reset} />}>
              {t("Cancel")}
            </DialogClose>

            <Button onClick={handleImportContacts}>
              {importCSVContactMutation.isPending && <Spinner />}
              {t("Import")}
            </Button>
          </div>
        </div>
      </DialogContent>
      <ContactImportErrorModal
        body={(importCSVContactMutation?.error as any)?.response?.data}
        isError={importCSVContactMutation.isError}
      />
    </Dialog>
  );
};
