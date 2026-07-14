import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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

interface DataTableRowActionsProps<TData> {
  row: {
    original: TData;
  };
}

export function DataTableRowActions<TData>({ row }: Readonly<DataTableRowActionsProps<TData>>) {
  const deleteCustomFieldMutation = useDeleteCustomFieldMutation();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: t("Are you sure you want to delete this label?"),
      description: t("This action is irreversible. Please confirm your action."),
      confirmText: t("Confirm"),
      cancelText: t("Cancel"),
    });

    if (!confirmed) return;

    deleteCustomFieldMutation.mutate((row.original as any)?.id);
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

const EditCustomFieldModal = ({ opened, setOpened, customField }) => {
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
