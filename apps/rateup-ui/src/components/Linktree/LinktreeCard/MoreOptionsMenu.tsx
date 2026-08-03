import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteLinktreeMutation } from "@/backend/linktree/linktree.query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/context/confirm-provider.tsx";

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

  const deleteLinktreeMutation = useDeleteLinktreeMutation(id);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  useEffect(() => {
    onModalOpen?.(isEditLinktreeModalOpen);
  }, [isEditLinktreeModalOpen, onModalOpen]);

  const handleShareClick = useCallback(() => {
    navigate({
      to: `/dashboard/quickAccessLinks/${shortUrlId}?tab=share`,
    });
  }, [navigate, shortUrlId]);

  const handleDeleteClick = useCallback(async () => {
    const shouldDelete = await confirm({
      title: translations("Delete Quick Access Link?"),
      description: translations("Are you sure to delete this Quick Access Link?"),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deleteLinktreeMutation.mutateAsync();
  }, [confirm, deleteLinktreeMutation, translations]);

  const handleRenameClick = useCallback(() => {
    setIsEditLinktreeModalOpen(true);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 p-0"
            />
          }
        >
          <IconDots size={16} />
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
      {isEditLinktreeModalOpen && (
        <CreateLinktreeModal
          opened={isEditLinktreeModalOpen}
          onClose={() => setIsEditLinktreeModalOpen(false)}
          mode="edit"
          shortUrlId={shortUrlId}
          initialName={name}
        />
      )}
    </>
  );
}

export default MoreOptionsMenu;
