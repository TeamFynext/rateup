import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteQrMutation } from "@/backend/generateQr/generateQr.query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import CreateShortUrlModal from "../CreateQrModal/index.tsx";

interface MoreOptionsMenuProps {
  shortUrlId: string;
  name: string;
  onModalOpen?: (isOpen: boolean) => void;
}

function MoreOptionsMenu({ shortUrlId, name, onModalOpen }: Readonly<MoreOptionsMenuProps>) {
  const [isEditLandingPageModalOpen, setIsEditLandingPageModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const deleteQrMutation = useDeleteQrMutation();
  const { t: translations } = useTranslation();

  useEffect(() => {
    onModalOpen?.(isEditLandingPageModalOpen || isDeleteConfirmOpen);
  }, [isEditLandingPageModalOpen, isDeleteConfirmOpen, onModalOpen]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleRenameClick = useCallback(() => {
    setIsEditLandingPageModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    deleteQrMutation.mutateAsync(shortUrlId);
    setIsDeleteConfirmOpen(false);
  }, [deleteQrMutation, shortUrlId]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="h-8 w-8 p-0"
          >
            <IconDots size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleRenameClick}>
            <IconEdit size={16} className="mr-2" />
            {translations("Rename")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
            <IconTrash size={16} className="mr-2" />
            {translations("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations("Delete QR?")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {translations("Are you sure to delete this QR?")}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{translations("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {translations("Delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {isEditLandingPageModalOpen && (
        <CreateShortUrlModal
          opened={isEditLandingPageModalOpen}
          onClose={() => setIsEditLandingPageModalOpen(false)}
          mode="Rename"
          shortUrlId={shortUrlId}
          initialName={name}
        />
      )}
    </>
  );
}

export default MoreOptionsMenu;
