"use client";

import { useState } from "react";

import { Paper, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useTranslations } from "next-intl";

import {
  useDeleteMenuItemMutation,
  useItemsByCategoryId,
  useUpdateMenuItemMutation,
} from "../../../backend/menu/item/mItem.query";
import { MenuItemPriceType } from "../../../types/enums";
import RateupLoader from "../../Loaders/RateupLoader";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { CreateMenuItemModal } from "../createMenuItem";
import { CategoryCardHeader } from "./CategoryCardHeader";
import SortDrawer from "./sortDrawer/SortDrawer";
import TableRow from "./table/TableRow";

const tableColumns = [
  "image",
  "name",
  "price",
  "description",
  "video URL",
  "Food Labels",
  "Actions",
  "Swap Order",
];
interface CategoryCardProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly searchText: string;
  readonly headerOrder: any;
  readonly currency: string;
}

export function CategoryCard({
  category,
  handleDelete,
  handleEdit,
  searchText,
  headerOrder,
  currency,
}: CategoryCardProps) {
  const [createMenuItemModalOpened, { close, open }] = useDisclosure(false);
  const [swapOrderOpened, { close: closeSwapOrder, toggle: toggleSwapOrder }] =
    useDisclosure(false);
  const translations = useTranslations();
  const [
    swapOrderCategoryOpened,
    { close: closeSwapOrderCategory, toggle: toggleSwapOrderCategory },
  ] = useDisclosure(false);
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

  let itemsSearch = [];
  if (searchText !== "") {
    itemsSearch = items?.filter((item) =>
      item?.name?.toLowerCase().includes(searchText?.toLowerCase()),
    );
  } else {
    itemsSearch = items;
  }
  const handleCreateItem = () => {
    setEditingItem(null);
    open();
  };

  if (isLoading || isError) {
    return (
      <PaperLayout>
        <CategoryCardHeader
          handleEdit={handleEdit}
          category={category}
          handleDelete={handleDelete}
          openCreateItem={handleCreateItem}
          toggleSwapOrder={toggleSwapOrderCategory}
        />
        <RateupLoader m="sm" />
      </PaperLayout>
    );
  }

  const filteredMenuItems = itemsSearch?.map(
    ({ id, name, images, disabled }) => ({
      id,
      name,
      image: images[0],
      disabled,
    }),
  );

  const rows = itemsSearch?.map((item) => (
    <TableRow
      item={item}
      MenuItemPriceType={MenuItemPriceType}
      deleteItemMutation={deleteItemMutation}
      setEditingItem={setEditingItem}
      key={item?.id}
      open={open}
      currency={currency}
      toggleSwapOrder={toggleSwapOrder}
      updateMenuItemMutation={updateMenuItemMutation}
    />
  ));

  return (
    <Paper
      h={"100%"}
      style={{ display: "flex", flexDirection: "column" }}
      pb={"0.3125rem"}
    >
      <CategoryCardHeader
        handleEdit={handleEdit}
        category={category}
        handleDelete={handleDelete}
        openCreateItem={handleCreateItem}
        toggleSwapOrder={toggleSwapOrderCategory}
      />
      <PaperLayout
        p={"1rem"}
        pt={0}
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          flex: 1,
          height: "100%",
        }}
      >
        <Table
          highlightOnHover
          horizontalSpacing="sm"
          verticalSpacing="xs"
          stickyHeader
        >
          <Table.Thead bg={"light-dark(white,var(--mantine-color-dark-6))"}>
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
                    {translations("No Items")}
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
    </Paper>
  );
}
