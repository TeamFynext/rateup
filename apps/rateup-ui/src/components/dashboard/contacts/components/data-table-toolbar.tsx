import {
  IconActivity,
  IconBan,
  IconBolt,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconDownload,
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useContactLabels,
  useDeleteManyContactsMutation,
  useExportContactsMutation,
} from "@/backend/campaign/contacts/contacts.query";
import AddToGroupModal from "@/components/Contacts/AddToGroupModal.tsx";
import ApplyLifecycletoContactsModal from "@/components/Contacts/ApplyLifecycletoContactsModal.tsx";
import AssignStageToContactsModal from "@/components/Contacts/AssignStageToContactsModal.tsx";
import CreateOrEditContactModal from "@/components/Contacts/CreatOrEditContactModal.tsx";
import ImportContactsDialog from "@/components/Contacts/ImportContactsDialog.tsx";
import LabelContactModal from "@/components/Contacts/LabelContactModal.tsx";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector.tsx";
import { StageSelector, usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import { TeamFeature } from "@/types/enums.ts";

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
            <ImportContactsDialog opened={openImportModal} setOpened={setOpenImportModal} />
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
