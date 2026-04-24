"use client";

import { useState } from "react";

import {
  IconCircleCheckFilled,
  IconDots,
  IconEdit,
  IconReplace,
  IconTrash,
  IconWashDrycleanOff,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import { MenuItemPriceType } from "../../../../types/enums";
import { fallbackImage } from "../../../../utils/constants";
import { getImageValue } from "../../../../utils/file-upload/upload";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../ui/dropdown-menu";
import { currencyLabel } from "../../util/currencyData";
import MenuFoodLabelBadge from "../tag/MenuFoodLabelBadge";

export interface MenuItemColumnHandlers {
  deleteItemMutation: any;
  setEditingItem: (item: MenuItem) => void;
  openEdit: () => void;
  toggleSwapOrder: () => void;
  updateMenuItemMutation: any;
  currency: string;
}

function NameCell({ item }: { readonly item: MenuItem }) {
  const t = useExtracted();
  return (
    <div className="flex flex-col gap-1">
      <span>{item.name}</span>
      {item.disabled && (
        <Badge variant="outline" className="w-fit text-xs">
          {t("Disabled")}
        </Badge>
      )}
    </div>
  );
}

function ActionsCell({
  item,
  handlers,
}: {
  readonly item: MenuItem;
  readonly handlers: MenuItemColumnHandlers;
}) {
  const [dialogOpened, setDialogOpened] = useState(false);
  const t = useExtracted();
  const {
    deleteItemMutation,
    setEditingItem,
    openEdit,
    toggleSwapOrder,
    updateMenuItemMutation,
  } = handlers;

  return (
    <>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        headerLabel={t("Are you sure to delete this Menu Item?")}
        headerTitle={t("Delete Menu Item?")}
        confirmLabel={t("Delete")}
        onConfirm={() => {
          toast.loading(t("Hold on, menu item is getting deleted..."), {
            id: "delete-data-menu-item",
          });
          deleteItemMutation.mutate(item.id);
          setDialogOpened(false);
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Row actions">
            <IconDots />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setEditingItem(item);
                openEdit();
              }}
            >
              <IconEdit />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                updateMenuItemMutation.mutate({
                  menuItemId: item.id,
                  menuItem: { disabled: !item.disabled },
                });
              }}
            >
              {item.disabled ? (
                <>
                  <IconCircleCheckFilled />
                  {t("Enable Item")}
                </>
              ) : (
                <>
                  <IconWashDrycleanOff />
                  {t("Disable Item")}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleSwapOrder}>
              <IconReplace />
              {t("Swap Order")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDialogOpened(true)}
          >
            <IconTrash />
            {t("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function getMenuItemColumns(
  handlers: MenuItemColumnHandlers,
): ColumnDef<MenuItem>[] {
  return [
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => {
        const item = row.original;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="rounded-md object-cover w-20"
            style={{ aspectRatio: "3/2" }}
            src={
              item.images?.length > 0
                ? getImageValue(
                    item.images[0],
                    false,
                    item.unsplashImage?.find((d) => d === item.images[0])
                      ?.length > 0,
                  )
                : fallbackImage
            }
            alt={item.name}
          />
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <NameCell item={row.original} />,
    },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) => {
        const item = row.original;
        const symbol = currencyLabel[handlers.currency]?.symbol ?? "";
        if (item.price?.type === MenuItemPriceType.FIXED) {
          return (
            <span className="font-medium">
              {item.price?.price ? `${symbol}${item.price.price}` : "—"}
            </span>
          );
        }
        return (
          <div className="flex flex-col gap-1.5">
            {item.price?.variants?.map((v) => (
              <div
                key={v.name}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-muted-foreground text-sm">{v.name}</span>
                {v.price && (
                  <span className="font-medium text-sm">
                    {symbol}
                    {v.price}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground line-clamp-2 max-w-48">
          {row.original.description}
        </p>
      ),
    },
    {
      accessorKey: "videoUrl",
      header: "Video URL",
      cell: ({ row }) => {
        const url = row.original.videoUrl;
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm underline-offset-4 hover:underline truncate max-w-36 block"
          >
            {url}
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      id: "foodLabels",
      header: "Food Labels",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1 max-w-48">
          <MenuFoodLabelBadge foodLabels={row.original.foodLabels ?? []} />
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsCell item={row.original} handlers={handlers} />
      ),
    },
  ];
}
