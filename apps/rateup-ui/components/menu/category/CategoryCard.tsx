import {
  ActionIcon,
  Anchor,
  Box,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Image,
} from "@mantine/core";
import {
  IconArrowBadgeDownFilled,
  IconEdit,
  IconTrash,
  IconArrowBadgeUpFilled,
} from "@tabler/icons-react";
import { useState } from "react";
import CenteredSpinner from "../../Loaders/CenteredSpinner";
import { useDisclosure } from "@mantine/hooks";
import {
  useDeleteMenuItemMutation,
  useItemsByCategoryId,
  useUpdateMenuItemMutation,
} from "../../../backend/menu/item/mItem.query";
import { CreateMenuItemModal } from "../createMenuItem";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { MenuItemPriceType } from "../../../types/enums";
import { CategoryCardHeader } from "./CategoryCardHeader";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import DeleteConfirmationBox from "../dialogBox/DeleteConfirmationBox";

const tableColumns = ["image", "name", "price", "description", "videoUrl"];
interface CategoryCardProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly searchText: string;
}
export function CategoryCard({
  category,
  handleDelete,
  handleEdit,
  searchText,
}: CategoryCardProps) {
  const [createMenuItemModalOpened, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

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
  const handleMenuOrder = (direction: string, item: any) => {
    updateMenuItemMutation.mutate({
      menuItemId: item.id,
      menuItem: {
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
        />
        <CenteredSpinner m="sm" />
      </Paper>
    );
  }

  const rows = itemsSearch?.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Image
          style={{ borderRadius: "4px", aspectRatio: "1/1" }}
          src={
            item.images.length > 0
              ? getFileUrlFromKey(item.images[0])
              : "/images/no_image_template.jpeg"
          }
          alt={item.name}
          h={100}
          w={100}
        />
      </Table.Td>
      <Table.Td tt={"capitalize"}>{item.name}</Table.Td>
      <Table.Td>
        {item.price.type === MenuItemPriceType.FIXED ? (
          <Text>₹{item.price.price}</Text>
        ) : (
          <Stack>
            {item?.price?.variants?.map((element) => (
              <Box key={element.name + item.id}>
                <Text c="dimmed" fz="md">
                  {element.name}
                </Text>
                <Text>₹{element.price}</Text>
              </Box>
            ))}
          </Stack>
        )}
      </Table.Td>
      <Table.Td>
        <Text lineClamp={7}>{item.description}</Text>
      </Table.Td>
      <Table.Td>
        <Anchor href={item.videoUrl} target="_blank">
          {item.videoUrl}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Group maw="100px" h="100px" align="center">
          <DeleteConfirmationBox
            closeDialog={closeDialog}
            dialogOpened={dialogOpened}
            data={item?.id}
            mutation={deleteItemMutation}
            text={"Are you sure to delete this Menu Item?"}
          />
          <ActionIcon
            c={"var(--tertiary-color)"}
            bg={"white"}
            radius={"md"}
            onClick={() => {
              setEditingItem(item);
              open();
            }}
          >
            <IconEdit />
          </ActionIcon>
          <ActionIcon c={"black"} bg={"white"} radius={"md"} onClick={toggle}>
            <IconTrash />
          </ActionIcon>
        </Group>
      </Table.Td>
      <Table.Td>
        <Stack pr={"sm"}>
          <ActionIcon
            disabled={item?.itemOrder === 0}
            variant={"transparent"}
            onClick={() => handleMenuOrder("up", item)}
          >
            <IconArrowBadgeUpFilled />
          </ActionIcon>
          <ActionIcon
            disabled={item?.itemOrder === itemsSearch?.length - 1}
            variant={"transparent"}
            onClick={() => handleMenuOrder("down", item)}
          >
            <IconArrowBadgeDownFilled />
          </ActionIcon>
        </Stack>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper>
      <CategoryCardHeader
        handleEdit={handleEdit}
        category={category}
        handleDelete={handleDelete}
        openCreateItem={handleCreateItem}
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
