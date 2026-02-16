"use client";

import { useEffect, useState } from "react";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";
import {
  Activity,
  Ban,
  Download,
  Folder,
  Globe,
  Info,
  Instagram,
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
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  useContactLabels,
  useDeleteManyContactsMutation,
  useExportContactsMutation,
  useImportCSVContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import AddToGroupModal from "@/components/Contacts/AddToGroupModal";
import ApplyLifecycletoContactsModal from "@/components/Contacts/ApplyLifecycletoContactsModal";
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal";
import CreateOrEditContactModal from "@/components/Contacts/CreatOrEditContactModal";
import LabelContactModal from "@/components/Contacts/LabelContactModal";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import CustomAlertDialog from "@/components/ui/custom/CustomAlertDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { useContactTableStore } from "../store/contact-table-store";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

const SourceSelector = ({ value, onChange }) => {
  const ContactSources = [
    { label: "All Sources", value: "all", icon: Layers },
    { label: "WhatsApp", value: "whatsapp", icon: IconBrandWhatsapp },
    { label: "Instagram", value: "instagram", icon: Instagram },
    { label: "Web", value: "WEBCHAT", icon: Globe },
    { label: "Manual", value: "manual", icon: UserRoundPlus },
    { label: "Imported", value: "csv import", icon: Upload },
  ];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] bg-gray-100 border-none">
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
}) => {
  const { data: contactLabels = [], isPending: isPendingContactLabels } =
    useContactLabels();
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
      ...[
        { id: "active", name: "Active", icon: Zap },
        { id: "blocked", name: "Blocked", icon: Ban },
      ],
    );
  }
  if (isPendingContactLabels) {
    return <Skeleton className="h-4 w-[150px]" />;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] bg-gray-100 border-none">
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

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { filter, setFilter } = useContactTableStore();
  const t = useTranslations();

  const [isOpenedAddContactModal, setIsOpenedAddContactModal] = useState(false);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openAddtoGroupModal, setOpenAddtoGroupModal] = useState(false);
  const [openLabelContactModal, setOpenLabelContactModal] = useState(false);
  const [openLifecycleContactModal, setOpenLifecycleContactModal] =
    useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const deleteManyContactsMutation = useDeleteManyContactsMutation();
  function handleDeleteContacts() {
    const selectedIds = Object.keys(table.getState().rowSelection);
    deleteManyContactsMutation?.mutate(selectedIds, {
      onSuccess: () => {
        toast.success("contact deleted successfully");
        resetRowSelection();
      },
      onError: () => {
        toast.error("Error deleting contacts");
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
                    searchTerm: event.currentTarget.value
                      ?.trimStart()
                      .replaceAll("+", ""),
                  })
                }
              />
            </div>
            <LifecycleSelector
              all={true}
              className="bg-gray-100 border-none w-48"
              value={filter?.lifecycleId}
              onChange={(value, lifecycleObj) =>
                setFilter({ ...filter, lifecycleId: value })
              }
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
              className="bg-rateup-blue"
              size="sm"
              onClick={() => setIsOpenedAddContactModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm">Add Contact</span>
            </Button>
            <ExportContacts table={table} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenImportModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm">{t("Import")}</span>
            </Button>
            <ImportContactModal
              opened={openImportModal}
              setOpened={setOpenImportModal}
            />
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.resetColumnFilters()}
              >
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
            <Button
              variant="outline"
              className="hover:text-red-500"
              onClick={() => setOpenDeleteModal(true)}
            >
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
      <CustomAlertDialog
        buttonTitle="Delete"
        title={"Delete contact"}
        description="Are you sure to delete these selected contacts?"
        onAction={handleDeleteContacts}
        buttonColor="bg-red-500"
        onCancel={() => {
          table.setRowSelection({});
        }}
        opened={openDeleteModal}
        setOpened={setOpenDeleteModal}
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

const ExportContacts = ({ table }) => {
  const exportMut = useExportContactsMutation();
  const leafColumns = table
    .getAllLeafColumns()
    ?.filter(
      (column) =>
        column.getIsVisible() && !["select", "action"].includes(column.id),
    )
    ?.map((col) => col.id);

  const handleExport = (type: string) => {
    if (!leafColumns?.length) {
      toast.error("Please select at least one field to export.");
      return;
    }
    exportMut.mutate({
      type,
      fields: leafColumns,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          <span className="font-medium text-sm">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          Download as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ImportContactModal = ({ opened, setOpened }) => {
  const t = useTranslations();

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
  const importCSVContactMutation = useImportCSVContactMutation();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState([]);
  const { customFields } = useCustomFieldsContext();

  useEffect(() => {
    if (csvfile) {
      const fileExtension = csvfile.name.split(".").pop()?.toLowerCase();
      if (fileExtension !== "csv" && fileExtension !== "xlsx") {
        setError(t("Please upload a valid CSV or XLSX file."));
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
      onError: () => {
        toast.error("Importing failed");
        setOpened(false);
      },
    });
  }

  function reset() {
    setCsvfile(null);
    setUpdateExisting(false);
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
            {t(
              "Import contacts from a CSV file to add them to your contact list",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 p-6">
          <p className="text-sm">{t("Custom Fields")}</p>
          <div className="flex gap-2">
            {customFields.map((field) => (
              <div className="flex items-center gap-3 rounded-lg bg-blue-100 p-1 w-fit px-2">
                <Checkbox
                  checked={fields.some((p) => p.id === field.id)}
                  id={field.id}
                  className="rounded-xl data-[state=unchecked]:bg-gray-200"
                  onCheckedChange={(checked) => {
                    setFields((prev) =>
                      checked
                        ? [...prev, field]
                        : prev.filter((p) => p.id !== field.id),
                    );
                  }}
                />
                <Label htmlFor={field.id} className="text-sm font-normal">
                  {field.name}
                </Label>
              </div>
            ))}
          </div>

          <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 flex flex-col gap-2">
            <div className="flex gap-2 text-blue-700 text-sm">
              <Info />
              {t(
                "Utilizing CSV/XLSX file uploads to generate contact requires specific fields in the file: name, phone",
              )}
            </div>

            <Button variant="secondary" onClick={handleDownloadDemo}>
              <Upload />
              <span className="font-medium text-sm">
                {t("Download Demo Csv File")}
              </span>
            </Button>
          </blockquote>
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="update-existing-data"
              className="data-[state=unchecked]:bg-gray-400"
              checked={updateExisting}
              onCheckedChange={setUpdateExisting}
            />
            <Label htmlFor="update-existing-data">
              {t("Update the existing data while importing")}
            </Label>
          </div>
          <div className="grid items-center gap-3 mt-4">
            <Input
              id="contact-csv"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setCsvfile(e.target.files?.[0] || null)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 mt-6 text-sm">
            <DialogClose asChild>
              <Button variant="secondary" onClick={reset}>
                {t("Cancel")}
              </Button>
            </DialogClose>

            <Button onClick={handleImportContacts}>
              {importCSVContactMutation.isPending && <Spinner />}
              {t("Import")}
            </Button>
          </div>
        </div>
      </DialogContent>
      <ContactImportErrorModal
        body={importCSVContactMutation?.error?.response?.data}
        isError={importCSVContactMutation.isError}
      />
    </Dialog>
  );
};
