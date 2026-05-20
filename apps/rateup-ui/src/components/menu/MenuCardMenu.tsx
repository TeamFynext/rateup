"use client";

import { useState } from "react";

import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useDeleteMenuMutation } from "@/backend/menu/menu.query";

import ConfirmationModal from "../Modal/ConfirmationModal.tsx";
import { Button } from "../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";

type MenuCardMenuProps = {
  readonly menuId: string;
  readonly teamId: string;
  readonly handleEditClick: (menu: Menu) => void;
  readonly menu: Menu;
};

function MenuCardMenu({
  menu,
  menuId,
  teamId,
  handleEditClick,
}: Readonly<MenuCardMenuProps>) {
  const [dialogOpened, setDialogOpened] = useState(false);
  const { t: translations } = useTranslation();
  const deleteMutation = useDeleteMenuMutation(
    teamId,
    () => {},
    () => {},
  );
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        headerLabel={translations("Are you sure to delete this Menu?")}
        headerTitle={translations("Delete Menu?")}
        confirmLabel={translations("Delete")}
        onConfirm={() => {
          toast.loading(translations("Hold on, menu is getting deleted..."), {
            id: "delete-data-menu",
          });
          deleteMutation.mutate(menuId);
          setDialogOpened(false);
        }}
      />
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(e) => e.stopPropagation()}
        >
          <IconDots size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => handleEditClick(menu)}>
          <IconEdit size={16} className="mr-2" />
          {translations("Rename")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            navigate({
              to: `/dashboard/menu/${menuId}?tab=Share`,
            });
          }}
        >
          <IconShare size={16} className="mr-2" />
          {translations("Share")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setDialogOpened(true)}
          variant="destructive"
        >
          <IconTrash size={16} className="mr-2" />
          {translations("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MenuCardMenu;
