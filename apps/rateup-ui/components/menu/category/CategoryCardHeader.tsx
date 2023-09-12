import { ActionIcon, Button, Group, Text, useMantineTheme } from "@mantine/core";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

interface CategoryCardHeaderProps {
  category: MenuCategory,
  handleDelete: (categoryId: string) => void,
  openCreateItem: () => void,
  handleEdit: (category: MenuCategory) => void
}
export function CategoryCardHeader({ category, handleDelete, openCreateItem, handleEdit }: CategoryCardHeaderProps) {
  const theme = useMantineTheme();
  return <Group
    position="apart"
    p="xs"
    sx={{
      backgroundImage: theme.fn.linearGradient(271, "#3F5BA9", "#62CBE6"),
      borderRadius: "8px 8px 0 0",
    }}>
    <div></div>
    <Text fz="1.5rem" c="white" fw={700}>{category.name}</Text>
    <Group>
      <Button
        c="white"
        leftIcon={<IconPlus />}
        onClick={openCreateItem}
        radius={"12px"}
      >
        Add Item
      </Button>
      <ActionIcon
        sx={{
          '&:hover': {
            color: theme.colors.blue[7]
          }
        }}
        c="white"
        onClick={() => handleEdit(category)}
      >
        <IconEdit />
      </ActionIcon>
      <ActionIcon
        c="red"
        onClick={() => handleDelete(category.id)}
      >
        <IconTrash />
      </ActionIcon>
    </Group>
  </Group>;
}
