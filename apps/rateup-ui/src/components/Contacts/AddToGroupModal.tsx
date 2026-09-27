import { IconFolder } from "@tabler/icons-react";

import {
  useAddExistingContactMutation,
  useContactGroup,
} from "@/backend/campaign/contactGroup/contactGroup.query";

import {
  Combobox,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

/**
 * Bulk "Add to group" from the contacts table: the same searchable list as the
 * inbox's tag picker, rendered in place. A click adds the selection and closes.
 */
const AddToGroupModal = ({
  opened,
  setOpened,
  selectedContactIds,
  onSuccess = null,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  selectedContactIds: string[];
  onSuccess?: (() => void) | null;
}) => {
  const { data: groups = [], isPending } = useContactGroup();
  const addToGroup = useAddExistingContactMutation();
  const items = groups.map((g) => ({ id: g.id, label: g.name }));
  const count = selectedContactIds.length;

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Add {count} contact{count === 1 ? "" : "s"} to a group
          </DialogTitle>
        </DialogHeader>
        {isPending ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : (
          <Combobox<{ id: string; label: string }>
            items={items}
            value={null}
            onValueChange={(item) => {
              if (!item || addToGroup.isPending) return;
              addToGroup.mutate(
                { customerList: selectedContactIds, groupId: item.id },
                {
                  onSuccess: () => {
                    onSuccess?.();
                    setOpened(false);
                  },
                },
              );
            }}
            inline
            open
            autoHighlight
          >
            <div className="overflow-hidden rounded-md bg-popover text-popover-foreground ring-1 ring-foreground/10">
              <ComboboxChipsInput
                autoFocus
                placeholder="Search groups"
                className="h-9 w-full shrink-0 border-b border-border px-3 text-sm"
              />
              <ComboboxEmpty>{items.length ? "No matches" : "No groups yet"}</ComboboxEmpty>
              <ComboboxList className="max-h-72">
                {(item: { id: string; label: string }) => (
                  <ComboboxItem key={item.id} value={item} disabled={addToGroup.isPending}>
                    <IconFolder className="text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </div>
          </Combobox>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToGroupModal;
