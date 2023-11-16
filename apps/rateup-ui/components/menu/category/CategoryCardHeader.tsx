import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import {
  IconArrowBadgeDownFilled,
  IconArrowBadgeUpFilled,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import React from "react";
import DeleteConfirmationBox from "../dialogBox/DeleteConfirmationBox";
import { useDisclosure } from "@mantine/hooks";

interface CategoryCardHeaderProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly openCreateItem: () => void;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly lastItemOrder: number;
  readonly initialOrder: number;
  readonly handleCategoryOrder: any;
}
export function CategoryCardHeader({
  category,
  handleDelete,
  openCreateItem,
  handleEdit,
  lastItemOrder,
  initialOrder,
  handleCategoryOrder,
}: CategoryCardHeaderProps) {
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

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
      <Text fz="1.5rem" c="white" fw={700} tt={"capitalize"}>
        {category.name}
      </Text>
      <Group>
        <DeleteConfirmationBox
          closeDialog={closeDialog}
          dialogOpened={dialogOpened}
          data={category?.id}
          mutation={handleDelete}
          text={"Are you sure to delete this Menu Category?"}
        />
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
        >
          <IconEdit />
        </ActionIcon>
        <ActionIcon c={"red"} bg={"white"} radius={"md"} onClick={toggle}>
          <IconTrash />
        </ActionIcon>
        <Stack pr={"sm"} gap={"xs"}>
          <ActionIcon
            disabled={category?.itemOrder === initialOrder}
            variant={"white"}
            onClick={() => handleCategoryOrder("up", category?.id)}
          >
            <IconArrowBadgeUpFilled />
          </ActionIcon>
          <ActionIcon
            disabled={category?.itemOrder === lastItemOrder}
            variant={"white"}
            onClick={() => handleCategoryOrder("down", category?.id)}
          >
            <IconArrowBadgeDownFilled />
          </ActionIcon>
        </Stack>
      </Group>
    </Group>
  );
}
