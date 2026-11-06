import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { useDeleteCustomFieldMutation } from "@/backend/campaign/contacts/contacts.query";
import { CustomFieldForm } from "@/components/Contacts/label-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

interface DataTableRowActionsProps {
  row: {
    original: CustomFieldData;
  };
}

export function DataTableRowActions({ row }: Readonly<DataTableRowActionsProps>) {
  const deleteCustomFieldMutation = useDeleteCustomFieldMutation();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: t("Delete this custom field?"),
      // Deleting the field cascades to every contact's value for it.
      description: t(
        "Its value will be removed from every contact that has one. This can't be undone.",
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!confirmed) return;

    deleteCustomFieldMutation.mutate(row.original?.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
          <IconDots className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleEdit}>
              <IconEdit className="size-3.5" />
              {t("Edit")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <IconTrash className="size-3.5" />
              {t("Delete")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCustomFieldModal opened={editOpen} setOpened={setEditOpen} customField={row.original} />
    </>
  );
}

const EditCustomFieldModal = ({
  opened,
  setOpened,
  customField,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  customField: CustomFieldData;
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Edit Custom Field")}</DialogTitle>
          <DialogDescription>
            {t("Edit custom field to store additional information about your contacts.")}
          </DialogDescription>
        </DialogHeader>
        <CustomFieldForm onSubmitCallback={() => setOpened(false)} data={customField} />
      </DialogContent>
    </Dialog>
  );
};
