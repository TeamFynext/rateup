import { Paper, Table, Text } from "@mantine/core";
import { useState } from "react";
import CenteredSpinner from "../../Loaders/CenteredSpinner";
import { useDisclosure } from "@mantine/hooks";
import {
  useDeleteMenuItemMutation,
  useItemsByCategoryId,
  useUpdateMenuItemMutation,
} from "../../../backend/menu/item/mItem.query";
import { CreateMenuItemModal } from "../createMenuItem";
import { MenuItemPriceType } from "../../../types/enums";
import { CategoryCardHeader } from "./CategoryCardHeader";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import TableRow from "./table/TableRow";
import { useUpdateMenuCategoryMutation } from "../../../backend/menu/category/mCategory.query";

const tableColumns = [
  "image",
  "name",
  "price",
  "description",
  "videoUrl",
  "Actions",
  "Ordering",
];
interface CategoryCardProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly searchText: string;
  readonly initialOrder: number;
  readonly lastItemOrder: number;
}

export function CategoryCard({
  category,
  handleDelete,
  handleEdit,
  searchText,
  initialOrder,
  lastItemOrder,
}: CategoryCardProps) {
  const [createMenuItemModalOpened, { close, open }] = useDisclosure(false);
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
    () => {}
  );
  const updateMenuItemMutation = useUpdateMenuItemMutation(
    category.id,
    category.menuId,
    () => {},
    () => {}
  );
  const editMenuCategoryMutation = useUpdateMenuCategoryMutation(
    category.menuId,
    () => {},
    () => {}
  );
  let itemsSearch = [];
  if (searchText !== "") {
    itemsSearch = items?.filter(
      (item) => item?.name?.toLowerCase().includes(searchText?.toLowerCase())
    );
  } else {
    itemsSearch = items;
  }
  const handleCreateItem = () => {
    setEditingItem(null);
    open();
  };
  const handleMenuOrder = (direction: string, itemId: string) => {
    updateMenuItemMutation.mutate({
      menuItemId: itemId,
      menuItem: {
        itemOrder: direction,
      },
    });
  };
  const handleCategoryOrder = (direction: string, itemId: string) => {
    editMenuCategoryMutation.mutate({
      categoryId: itemId,
      menuCategory: {
        itemOrder: direction,
      },
    });
  };
  if (isLoading || isError) {
    return (
      <Paper>
        <CategoryCardHeader
          handleEdit={handleEdit}
          category={category}
          handleDelete={handleDelete}
          openCreateItem={handleCreateItem}
          initialOrder={initialOrder}
          lastItemOrder={lastItemOrder}
          handleCategoryOrder={handleCategoryOrder}
        />
        <CenteredSpinner m="sm" />
      </Paper>
    );
  }

  const rows = itemsSearch?.map((item) => (
    <TableRow
      item={item}
      MenuItemPriceType={MenuItemPriceType}
      deleteItemMutation={deleteItemMutation}
      handleMenuOrder={handleMenuOrder}
      lastItemOrder={itemsSearch?.slice(-1)[0]?.itemOrder}
      setEditingItem={setEditingItem}
      initialOrder={itemsSearch[0]?.itemOrder}
      key={item?.id}
      open={open}
    />
  ));

  return (
    <Paper>
      <CategoryCardHeader
        handleEdit={handleEdit}
        category={category}
        handleDelete={handleDelete}
        openCreateItem={handleCreateItem}
        initialOrder={initialOrder}
        lastItemOrder={lastItemOrder}
        handleCategoryOrder={handleCategoryOrder}
      />
      <PaperLayout bg={"var(--bg-grey-color)"} p={0}>
        <Table
          highlightOnHover
          horizontalSpacing="sm"
          verticalSpacing="xs"
          m="xs"
        >
          <Table.Thead>
            <Table.Tr>
              {tableColumns?.map((key) => (
                <Table.Th key={key} align="left">
                  <Text fz="lg" fw={500} tt="capitalize">
                    {key}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {itemsSearch.length !== 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={tableColumns?.length}>
                  <Text fw={500} ta="center" c={"dimmed"}>
                    No Items
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </PaperLayout>
      <CreateMenuItemModal
        opened={createMenuItemModalOpened}
        close={close}
        categoryId={category?.id}
        menuId={category?.menuId}
        editingItem={editingItem}
      />
    </Paper>
  );
}
