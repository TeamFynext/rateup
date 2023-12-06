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
import SortDrawer from "./sortDrawer/SortDrawer";

const tableColumns = [
  "image",
  "name",
  "price",
  "description",
  "video URL",
  "Actions",
  "Swap Order",
];
interface CategoryCardProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly searchText: string;
  readonly headerOrder: any;
}

export function CategoryCard({
  category,
  handleDelete,
  handleEdit,
  searchText,
  headerOrder,
}: CategoryCardProps) {
  const [createMenuItemModalOpened, { close, open }] = useDisclosure(false);
  const [swapOrderOpened, { close: closeSwapOrder, toggle: toggleSwapOrder }] =
    useDisclosure(false);
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
    itemsSearch = items?.filter(
      (item) => item?.name?.toLowerCase().includes(searchText?.toLowerCase()),
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
      <Paper>
        <CategoryCardHeader
          handleEdit={handleEdit}
          category={category}
          handleDelete={handleDelete}
          openCreateItem={handleCreateItem}
          toggleSwapOrder={toggleSwapOrderCategory}
        />
        <CenteredSpinner m="sm" />
      </Paper>
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
      toggleSwapOrder={toggleSwapOrder}
      updateMenuItemMutation={updateMenuItemMutation}
    />
  ));

  return (
    <Paper>
      <CategoryCardHeader
        handleEdit={handleEdit}
        category={category}
        handleDelete={handleDelete}
        openCreateItem={handleCreateItem}
        toggleSwapOrder={toggleSwapOrderCategory}
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
