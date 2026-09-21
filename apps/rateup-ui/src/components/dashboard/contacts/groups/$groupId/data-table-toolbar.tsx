import { IconPlus, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
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
                  className="gap-2 h-8 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <IconTrash className="w-3.5 h-3.5" />
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
              className="gap-2 h-8 shadow-md"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span className="text-sm">Add Members</span>
            </Button>
            <div className="relative w-80">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or phone..."
                value={filter.searchTerm}
                onChange={(e) => setFilter({ searchTerm: e.currentTarget.value })}
                className="pl-10 h-8 border-border focus:ring-2 focus:ring-primary/20 placeholder:text-sm"
              />
              {filter.searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setFilter({ searchTerm: "" })}
                >
                  <IconX className="w-3.5 h-3.5" />
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
      {/* The body is a whole contact form or a paginated table, so the dialog's `sm:max-w-md`
          default is far too narrow and its content is taller than the viewport. The second grid
          row is the shrinkable one, which is what lets the body scroll instead of the page. */}
      <DialogContent className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>Select contacts to add to this group</DialogDescription>
        </DialogHeader>
        {/* Negative margin so the scrollbar sits at the dialog's edge, padding so focus rings
            and the table card's shadow are not clipped by the scroll container. */}
        <div className="-mx-6 min-h-0 overflow-y-auto overscroll-contain px-6 py-1">
          <AddCustomerModal
            close={close}
            groupId={group?.id}
            existingContactIds={group?.contacts?.map((c) => c.id)}
            createNewContactsFromCSV={createNewContactsFromCSV}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
