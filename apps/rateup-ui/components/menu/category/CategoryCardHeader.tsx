import {
  ActionIcon,
  Button,
  Group,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import React from "react";

interface CategoryCardHeaderProps {
  category: MenuCategory;
  handleDelete: (categoryId: string) => void;
  openCreateItem: () => void;
  handleEdit: (category: MenuCategory) => void;
}
export function CategoryCardHeader({
  category,
  handleDelete,
  openCreateItem,
  handleEdit,
}: CategoryCardHeaderProps) {
  const theme = useMantineTheme();

  const [isHovered, setIsHovered] = React.useState(false);
  const iconStyle = {
    color: isHovered ? theme.colors.blue[7] : "white",
    transition: "color 0.3s ease", // Add a smooth transition effect
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Group
      justify="space-between"
      p="xs"
      style={{
        backgroundColor: "var(--tertiary-color)",
        borderRadius: "0.9375rem 0.9375rem 0rem 0rem",
      }}
    >
      <div></div>
      <Text fz="1.5rem" c="white" fw={700}>
        {category.name}
      </Text>
      <Group>
        <Button
          c={"var(--tertiary-color)"}
          bg={"white"}
          rightSection={<IconPlus />}
          onClick={openCreateItem}
          radius={"lg"}
        >
          Add
        </Button>
        <ActionIcon
          c={"var(--tertiary-color)"}
          bg={"white"}
          radius={"md"}
          onClick={() => handleEdit(category)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <IconEdit />
        </ActionIcon>
        <ActionIcon
          c={"red"}
          bg={"white"}
          radius={"md"}
          onClick={() => handleDelete(category.id)}
        >
          <IconTrash />
        </ActionIcon>
      </Group>
    </Group>
  );
}
