import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteQrMutation } from "@/backend/generateQr/generateQr.query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/context/confirm-provider.tsx";

import CreateShortUrlModal from "../CreateQrModal/index.tsx";

interface MoreOptionsMenuProps {
  shortUrlId: string;
  name: string;
  onModalOpen?: (isOpen: boolean) => void;
}

function MoreOptionsMenu({ shortUrlId, name, onModalOpen }: Readonly<MoreOptionsMenuProps>) {
  const [isEditLandingPageModalOpen, setIsEditLandingPageModalOpen] = useState(false);

  const deleteQrMutation = useDeleteQrMutation();
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  useEffect(() => {
    onModalOpen?.(isEditLandingPageModalOpen);
  }, [isEditLandingPageModalOpen, onModalOpen]);

  const handleDeleteClick = useCallback(async () => {
    const shouldDelete = await confirm({
      title: translations("Delete QR?"),
      description: translations("Are you sure to delete this QR?"),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deleteQrMutation.mutateAsync(shortUrlId);
  }, [confirm, deleteQrMutation, shortUrlId, translations]);

  const handleRenameClick = useCallback(() => {
    setIsEditLandingPageModalOpen(true);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
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
          <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
            <IconTrash size={16} className="mr-2" />
            {translations("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
