"use client";

import { useMemo, useState } from "react";

import {
  IconDots,
  IconEdit,
  IconPlus,
  IconReplace,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDeleteMenuItemMutation,
  useItemsByCategoryId,
  useUpdateMenuItemMutation,
} from "@/backend/menu/item/mItem.query";

import ConfirmationModal from "../../Modal/ConfirmationModal.tsx";
import { DataTable } from "../../Table/data-table.tsx";
import { Button } from "../../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu.tsx";
import { CreateMenuItemModal } from "../createMenuItem.tsx";
import SortDrawer from "./sortDrawer/SortDrawer.tsx";
import { getMenuItemColumns } from "./table/columns.tsx";

interface CategoryCardProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly searchText: string;
  readonly headerOrder: any;
  readonly currency: string;
}

interface CategoryTableToolbarProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly openCreateItem: () => void;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly toggleSwapOrder: () => void;
}

function CategoryTableToolbar({
  category,
  handleDelete,
  openCreateItem,
  handleEdit,
  toggleSwapOrder,
}: CategoryTableToolbarProps) {
  const [dialogOpened, setDialogOpened] = useState(false);
  const { t: translations } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <h2 className="text-base font-semibold capitalize">{category.name}</h2>
      <div className="flex items-center gap-2">
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={() => setDialogOpened(false)}
          headerLabel={translations("Are you sure to delete this category?")}
          headerTitle={translations("Delete Category?")}
          confirmLabel={translations("Delete")}
          onConfirm={() => {
            toast.loading(
              translations("Hold on, category is getting deleted..."),
              { id: "delete-data-menu-category" },
            );
            handleDelete.mutate(category?.id);
            setDialogOpened(false);
          }}
        />
        <Button size="sm" onClick={openCreateItem}>
          <IconPlus data-icon="inline-start" />
          {translations("Add")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More actions">
              <IconDots />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleEdit(category)}>
                <IconEdit />
                {translations("Edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleSwapOrder}>
                <IconReplace />
                {translations("Swap Order")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialogOpened(true)}
            >
              <IconTrash />
              {translations("Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function CategoryCard({
  category,
  handleDelete,
  handleEdit,
  searchText,
  headerOrder,
  currency,
}: CategoryCardProps) {
  const [createMenuItemModalOpened, setCreateMenuItemModalOpened] =
    useState(false);
  const open = () => setCreateMenuItemModalOpened(true);
  const close = () => setCreateMenuItemModalOpened(false);

  const [swapOrderOpened, setSwapOrderOpened] = useState(false);
  const closeSwapOrder = () => setSwapOrderOpened(false);
  const toggleSwapOrder = () => setSwapOrderOpened((prev) => !prev);

  const [swapOrderCategoryOpened, setSwapOrderCategoryOpened] = useState(false);
  const closeSwapOrderCategory = () => setSwapOrderCategoryOpened(false);
  const toggleSwapOrderCategory = () =>
    setSwapOrderCategoryOpened((prev) => !prev);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const {
    isLoading,
    isError,
    data: items,
  } = useItemsByCategoryId(category.id, category.menuId);
  const deleteItemMutation = useDeleteMenuItemMutation(
    category.id,
    category.menuId,
    () => {},
    () => {},
  );
  const updateMenuItemMutation = useUpdateMenuItemMutation(
    category?.id,
    category?.menuId,
    () => {},
    () => {},
  );

  const columns = useMemo(
    () =>
      getMenuItemColumns({
        deleteItemMutation,
        setEditingItem,
        openEdit: open,
        toggleSwapOrder,
        updateMenuItemMutation,
        currency,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency],
  );

  let itemsSearch: MenuItem[] = [];
  if (searchText === "") {
    itemsSearch = items ?? [];
  } else {
    itemsSearch =
      items?.filter((item) =>
        item?.name?.toLowerCase().includes(searchText?.toLowerCase()),
      ) ?? [];
  }
  const handleCreateItem = () => {
    setEditingItem(null);
    open();
  };

  const dataTableToolbar = () => (
    <CategoryTableToolbar
      handleEdit={handleEdit}
      category={category}
      handleDelete={handleDelete}
      openCreateItem={handleCreateItem}
      toggleSwapOrder={toggleSwapOrderCategory}
    />
  );

  if (isLoading || isError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={[]}
            isPending
            DataTableToolbar={dataTableToolbar}
          />
        </div>
      </div>
    );
  }

  const filteredMenuItems = itemsSearch.map(
    ({ id, name, images, disabled }) => ({
      id,
      name,
      image: typeof images[0] === "string" ? images[0] : "",
      disabled,
    }),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={itemsSearch}
          DataTableToolbar={dataTableToolbar}
        />
      </div>
      <CreateMenuItemModal
        opened={createMenuItemModalOpened}
        close={close}
        categoryId={category?.id}
        menuId={category?.menuId}
        editingItem={editingItem}
        currency={currency}
      />
      <SortDrawer
        close={closeSwapOrder}
        opened={swapOrderOpened}
        data={filteredMenuItems}
        category={{ categoryId: category?.id, menuId: category?.menuId }}
        categoryOrNot={false}
      />
      <SortDrawer
        close={closeSwapOrderCategory}
        opened={swapOrderCategoryOpened}
        data={headerOrder}
        category={{ categoryId: category?.id, menuId: category?.menuId }}
        categoryOrNot={true}
      />
    </div>
  );
}
