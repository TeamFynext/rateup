import type { Table } from "@tanstack/react-table";
import { Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useAddNewContactFromCSVMutation,
  useRemoveContactsFromGroup,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import AddCustomerModal from "@/components/Contacts/AddCustomerModal.tsx";
import { useGroupTableStore } from "@/components/dashboard/contacts/store/group-table-store.ts";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

interface DataTableToolbarProps<TData, _TValue> {
  table: Table<TData>;
}

export function DataTableToolbar<TData, TValue>({
  table,
}: Readonly<DataTableToolbarProps<TData, TValue>>) {
  const [isOpenedAddModal, setIsOpenedAddModal] = useState(false);

  const { groupDetails, filter, setFilter } = useGroupTableStore();
  const removeContactsMutation = useRemoveContactsFromGroup(groupDetails?.id ?? "");
  const selectedMembers = Object.keys(table.getState().rowSelection);
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
    <div className="shrink-0 p-3 bg-linear-to-r from-gray-50 to-white border-b shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">Group Members</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedMembers.length > 0
              ? `${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""} selected`
              : "Search and manage your group members"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {selectedMembers.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveMembers}
                  className="gap-2 h-8 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-sm">Remove ({selectedMembers.length})</span>
                </Button>
                {removeContactsMutation.isPending && <Spinner />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setRowSelection({})}
                  className="gap-2 h-8"
                >
                  <span className="text-sm">Clear</span>
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
              </>
            ) : null}
            <Button
              size="sm"
              onClick={() => setIsOpenedAddModal(true)}
              className="gap-2 h-8 bg-linear-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-sm">Add Members</span>
            </Button>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or phone..."
                value={filter.searchTerm}
                onChange={(e) => setFilter({ searchTerm: e.currentTarget.value })}
                className="pl-10 h-8 border-gray-200 focus:ring-2 focus:ring-primary/20 placeholder:text-sm"
              />
              {filter.searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setFilter({ searchTerm: "" })}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <AddContactToGroupDialog
        opened={isOpenedAddModal}
        setOpened={setIsOpenedAddModal}
        group={groupDetails!}
      />
    </div>
  );
}

const AddContactToGroupDialog = ({
  opened,
  setOpened,
  group,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  group: ContactGroupwithContacts;
}) => {
  function close() {
    setOpened(false);
  }
  const createNewContactsFromCSV = useAddNewContactFromCSVMutation(group?.id);
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>Select contacts to add to this group</DialogDescription>
        </DialogHeader>
        <AddCustomerModal
          close={close}
          groupId={group?.id}
          existingContactIds={group?.contacts?.map((c) => c.id)}
          createNewContactsFromCSV={createNewContactsFromCSV}
        />
      </DialogContent>
    </Dialog>
  );
};
