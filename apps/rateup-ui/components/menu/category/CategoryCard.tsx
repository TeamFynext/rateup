import { ActionIcon, Anchor, Box, Group, Paper, Stack, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import CenteredSpinner from "../../Loaders/CenteredSpinner";
import { useDisclosure } from "@mantine/hooks";
import { useDeleteMenuItemMutation, useItemsByCategoryId } from "../../../backend/menu/item/mItem.query";
import { CreateMenuItemModal } from "../createMenuItem";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { MenuItemPriceType } from "../../../types/enums";
import { CategoryCardHeader } from "./CategoryCardHeader";

const tableColumns = ["image", "name", "description", "price", "videoUrl"];
interface CategoryCardProps {
  category: MenuCategory,
  handleDelete: (categoryId: string) => void,
  handleEdit: (category: MenuCategory) => void
}
export function CategoryCard({ category, handleDelete, handleEdit }: CategoryCardProps) {
  const [createMenuItemModalOpened, { close, open }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const { isLoading, isError, data: items } = useItemsByCategoryId(category.id, category.menuId);
  const deleteItemMutation = useDeleteMenuItemMutation(category.id, category.menuId, () => { }, () => { });

  const handleCreateItem = () => {
    setEditingItem(null);
    open();
  };

  if (isLoading || isError) {
    return (
      <Paper>
        <CategoryCardHeader handleEdit={handleEdit} category={category} handleDelete={handleDelete} openCreateItem={handleCreateItem} />
        <CenteredSpinner m="sm" />
      </Paper>
    );
  }

  return (
    <Paper>
      <CategoryCardHeader handleEdit={handleEdit} category={category} handleDelete={handleDelete} openCreateItem={handleCreateItem} />
      <Table
        striped
        highlightOnHover
        horizontalSpacing="sm" verticalSpacing="xs"
        m="xs"
      >
        <thead>
          <tr>
            {tableColumns.map((key) => (
              <th key={key} align="left">
                <Text fz="lg" fw={500} tt="capitalize">{key}</Text></th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.length !== 0 && (
            items.map((item) => (
              <tr key={item.id}>
                <td width={100}>
                  <img style={{ borderRadius: "4px", aspectRatio: "1/1" }} src={item.images.length > 0 ? getFileUrlFromKey(item.images[0]) : "/images/no_image_template.jpeg"} alt={item.name} width="100px" />
                </td>
                <td>{item.name}</td>
                <td>
                  <Text
                    lineClamp={7}
                  >
                    {item.description}
                  </Text>
                </td>
                <td>{item.price.type === MenuItemPriceType.FIXED ? (
                  <Text style={{
                    textAlign:'center'
                  }}> ₹{item.price.price}</Text>
                ) : (
                  <Stack>
                    {item.price.variants.map(v => (
                      <Box>
                        <Text c="dimmed" style={{
              textAlign:'center'
            }} fz="md">
                          {v.name}
                        </Text>
                        <Text style={{
              textAlign:'center'
            }}>
                          ₹{v.price}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                )}

                </td>
                <td><Anchor href={item.videoUrl} target="_blank">{item.videoUrl}</Anchor></td>
                <td>
                  <Group maw="100px" h="100px" align="center">
                    <ActionIcon
                      onClick={() => {
                        setEditingItem(item);
                        open();
                      }}
                    >
                      <IconEdit />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group></td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      {items.length === 0 && (
        <Text style={{
          textAlign:'center'
        }} p="md">No items</Text>
      )}
      <CreateMenuItemModal opened={createMenuItemModalOpened} close={close} categoryId={category.id} menuId={category.menuId} editingItem={editingItem} />
    </Paper>
  );
}
