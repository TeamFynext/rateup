"use client";

import React, { useState } from "react";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { BusinessHoursItem } from "./schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: BusinessHoursItem[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
};

export function BusinessHoursListDialog({
  open,
  onOpenChange,
  list,
  onAdd,
  onEdit,
  onDelete,
  canDelete,
}: Readonly<Props>) {
  const t = useTranslations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
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
              <Plus className="w-4 h-4" />
              {t("Add New Business Hours")}
            </Button>

            <div className="space-y-3">
              {list.map((bh) => (
                <div
                  key={bh.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onEdit(bh.id)}
                    >
                      <h4 className="font-medium">{bh.name}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>⏰ {bh.timezone}</span>
                        {/* <span>📱 {bh.channels?.join(", ") || "No channels"}</span> */}
                      </div>
                      {bh.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {bh.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(bh.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {/* {canDelete && ( */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(bh.id, bh.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Business Hours")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete")}{" "}
              <strong>"{itemToDelete?.name}"</strong>?{" "}
              {t("This action cannot be undone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
