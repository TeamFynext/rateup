import { ActionIcon, Button, Group, Text, useMantineTheme } from "@mantine/core";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import React from 'react';

interface CategoryCardHeaderProps {
  category: MenuCategory,
  handleDelete: (categoryId: string) => void,
  openCreateItem: () => void,
  handleEdit: (category: MenuCategory) => void
}
export function CategoryCardHeader({ category, handleDelete, openCreateItem, handleEdit }: CategoryCardHeaderProps) {
  const theme = useMantineTheme();

  const [isHovered, setIsHovered] = React.useState(false);
  const iconStyle = {
    color: isHovered ? theme.colors.blue[7] : 'white',
    transition: 'color 0.3s ease', // Add a smooth transition effect
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return <Group
    justify="space-between"
    p="xs"
    style={{
      backgroundImage: `linear-gradient(271deg, #3F5BA9, #62CBE6)`,
      borderRadius: "8px 8px 0 0",
    }}
    // style={{
    //   backgroundImage: theme.fn.linearGradient(271, "#3F5BA9", "#62CBE6"),
    //   borderRadius: "8px 8px 0 0",
    // }}
    >

    <div></div>
    <Text fz="1.5rem" c="white" fw={700}>{category.name}</Text>
    <Group>
      <Button
        c="white"
        leftSection={<IconPlus />}
        onClick={openCreateItem}
        radius={"12px"}
      >
        Add Item
      </Button>
      <ActionIcon
        style={iconStyle}
        c="white"
        onClick={() => handleEdit(category)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
