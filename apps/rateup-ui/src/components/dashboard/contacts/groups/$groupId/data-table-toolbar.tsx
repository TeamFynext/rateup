import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconUsersPlus,
  IconX,
} from "@tabler/icons-react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useAddNewContactFromCSVMutation,
  useAddNewContactMutation,
  useRemoveContactsFromGroup,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import AddExistingContacts from "@/components/Contacts/AddExistingContacts.tsx";
import CreateOrEditContactModal from "@/components/Contacts/CreatOrEditContactModal.tsx";
import ImportContactsDialog from "@/components/Contacts/ImportContactsDialog.tsx";
import { useGroupTableStore } from "@/components/dashboard/contacts/store/group-table-store.ts";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData extends RowData, _TValue> {
  table: ReactTable<DataTableFeatures, TData>;
}

export function DataTableToolbar<TData extends RowData, TValue>({
  table,
}: Readonly<DataTableToolbarProps<TData, TValue>>) {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<"existing" | "new" | "import" | null>(null);
  const closeDialog = (open: boolean) => {
    if (!open) setOpenDialog(null);
  };

  const { groupDetails, filter, setFilter } = useGroupTableStore();
  const removeContactsMutation = useRemoveContactsFromGroup(groupDetails?.id ?? "");
  const addNewContact = useAddNewContactMutation(groupDetails?.id ?? "");
  const importIntoGroup = useAddNewContactFromCSVMutation(groupDetails?.id ?? "");
  const selectedMembers = Object.keys(table.state.rowSelection);
  function handleRemoveMembers() {
    if (!selectedMembers.length) return;
    removeContactsMutation?.mutate(
      { contactIds: selectedMembers, groupId: groupDetails?.id ?? "" },
      {
        onSuccess: () => {
          toast.success("contact removed successfully");
          table.setRowSelection({});
        },
        onError: (error) => {
          toast.error(error?.message || "Error removing contacts");
        },
      },
    );
  }
  return (
    <Card className="mb-4 p-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("Search by name or phone...")}
              value={filter.searchTerm}
              onChange={(e) => setFilter({ searchTerm: e.currentTarget.value })}
              className="border-none bg-muted pl-10 pr-9 placeholder:text-sm"
            />
            {/* Centred with margins: Button's `active:translate-y-px` would override a
                `-translate-y-1/2` on press and move it out from under the cursor. */}
            {filter.searchTerm && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("Clear search")}
                className="absolute inset-y-0 right-1.5 my-auto"
                onClick={() => setFilter({ searchTerm: "" })}
              >
                <IconX />
              </Button>
            )}
          </div>
          <Button size="sm" onClick={() => setOpenDialog("existing")}>
            <IconUsersPlus data-icon="inline-start" />
            {t("Add existing")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpenDialog("new")}>
            <IconPlus data-icon="inline-start" />
            {t("New contact")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpenDialog("import")}>
            <IconUpload data-icon="inline-start" />
            {t("Import")}
          </Button>
          <DataTableViewOptions table={table} />
        </div>
        {selectedMembers.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("{count} Selected", { count: selectedMembers.length })}
            </span>
            <Button
              variant="outline"
              className="hover:text-destructive"
              onClick={handleRemoveMembers}
              loading={removeContactsMutation.isPending}
            >
              <IconTrash />
              <span>{t("Remove from group")}</span>
            </Button>
            <Button variant="ghost" onClick={() => table.setRowSelection({})}>
              {t("Clear selection")}
            </Button>
          </div>
        )}
      </div>
      <AddExistingContactsDialog
        opened={openDialog === "existing"}
        setOpened={closeDialog}
        group={groupDetails!}
      />
      <CreateOrEditContactModal
        opened={openDialog === "new"}
        setOpened={closeDialog}
        createNewContactMutation={addNewContact}
      />
      <ImportContactsDialog
        opened={openDialog === "import"}
        setOpened={closeDialog}
        importMutation={importIntoGroup}
        groupId={groupDetails?.id}
        description={t("Upload a CSV or Excel file. Each row becomes a contact in this group.")}
      />
    </Card>
  );
}

const AddExistingContactsDialog = ({
  opened,
  setOpened,
  group,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  group: ContactGroupwithContacts;
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Add existing contacts")}</DialogTitle>
          <DialogDescription>
            {t("Tick the contacts to add to {group}.", { group: group?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <AddExistingContacts
          close={() => setOpened(false)}
          groupId={group?.id}
          existingContactIds={group?.contacts?.map((c) => c.id) ?? []}
        />
      </DialogContent>
    </Dialog>
  );
};
