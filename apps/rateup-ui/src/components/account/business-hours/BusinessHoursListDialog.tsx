import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { IBusinessHour } from "@/backend/org/business-hours/business-hours.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: IBusinessHour[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

export function BusinessHoursListDialog({
  open,
  onOpenChange,
  list,
  onAdd,
  onEdit,
  onDelete,
  canDelete: _canDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const handleDeleteClick = async (id: string, name: string) => {
    const shouldDelete = await confirm({
      title: t("Delete Business Hours"),
      description: `${t("Are you sure you want to delete")} "${name}"? ${t("This action cannot be undone")}`,
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    onDelete(id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("Business Hours Management")}</DialogTitle>
            <DialogDescription>
              {t(
                "Click the 'plus' icon to add new business hours, or click your already set up business hours, to edit them",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              onClick={onAdd}
              className="w-full border-2 border-dashed  text-gray-700 flex items-center gap-2"
              variant="outline"
            >
              <IconPlus className="w-4 h-4" />
              {t("Add New Business Hours")}
            </Button>

            <div className="space-y-3">
              {list.map((bh) => (
                <div
                  key={bh.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => onEdit(bh.id)}>
                      <h4 className="font-medium">{bh.name}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>⏰ {bh.timezone}</span>
                        {/* <span>📱 {bh.channels?.join(", ") || "No channels"}</span> */}
                      </div>
                      {bh.description && (
                        <p className="text-sm text-gray-600 mt-1">{bh.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(bh.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <IconEdit className="w-4 h-4" />
                      </Button>
                      {/* {canDelete && ( */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(bh.id, bh.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <IconTrash className="w-4 h-4" />
                      </Button>
                      {/* )} */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
