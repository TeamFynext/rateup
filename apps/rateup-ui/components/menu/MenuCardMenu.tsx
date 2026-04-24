"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import { useDeleteMenuMutation } from "../../backend/menu/menu.query";
import ConfirmationModal from "../Modal/ConfirmationModal";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
  const translations = useExtracted();
  const deleteMutation = useDeleteMenuMutation(
    teamId,
    () => {},
    () => {},
  );
  const router = useRouter();

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
            router.push(`/dashboard/menu/${menuId}?tab=Share`);
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
