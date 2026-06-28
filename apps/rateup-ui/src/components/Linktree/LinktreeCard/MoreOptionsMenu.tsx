import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteLinktreeMutation } from "@/backend/linktree/linktree.query";
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

import CreateLinktreeModal from "../CreateLinktreeModal/index.tsx";

interface MoreOptionsMenuProps {
  shortUrlId: string;
  id: string;
  name: string;
  onModalOpen?: (isOpen: boolean) => void;
}

function MoreOptionsMenu({ shortUrlId, id, name, onModalOpen }: Readonly<MoreOptionsMenuProps>) {
  const navigate = useNavigate();
  const [isEditLinktreeModalOpen, setIsEditLinktreeModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const deleteLinktreeMutation = useDeleteLinktreeMutation(id);
  const { t: translations } = useTranslation();

  useEffect(() => {
    onModalOpen?.(isEditLinktreeModalOpen || isDeleteConfirmOpen);
  }, [isEditLinktreeModalOpen, isDeleteConfirmOpen, onModalOpen]);

  const handleShareClick = useCallback(() => {
    navigate({
      to: `/dashboard/quickAccessLinks/${shortUrlId}?tab=share`,
    });
  }, [navigate, shortUrlId]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleRenameClick = useCallback(() => {
    setIsEditLinktreeModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    deleteLinktreeMutation.mutateAsync();
    setIsDeleteConfirmOpen(false);
  }, [deleteLinktreeMutation]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
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
          <DropdownMenuItem onClick={handleShareClick}>
            <IconShare size={16} className="mr-2" />
            {translations("Share")}
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
            <AlertDialogTitle>{translations("Delete Quick Access Link?")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {translations("Are you sure to delete this Quick Access Link?")}
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

      {isEditLinktreeModalOpen && (
        <CreateLinktreeModal
          opened={isEditLinktreeModalOpen}
          onClose={() => setIsEditLinktreeModalOpen(false)}
          mode="Rename"
          shortUrlId={shortUrlId}
          initialName={name}
        />
      )}
    </>
  );
}

export default MoreOptionsMenu;
