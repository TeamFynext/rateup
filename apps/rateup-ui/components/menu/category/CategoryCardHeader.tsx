import { Button, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconPlus,
  IconReplace,
  IconTrash,
} from "@tabler/icons-react";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import { ActionIconCommon } from "../ActionIcon/ActionIconCommon";

interface CategoryCardHeaderProps {
  readonly category: MenuCategory;
  readonly handleDelete: any;
  readonly openCreateItem: () => void;
  readonly handleEdit: (category: MenuCategory) => void;
  readonly toggleSwapOrder: () => void;
}
export function CategoryCardHeader({
  category,
  handleDelete,
  openCreateItem,
  handleEdit,
  toggleSwapOrder,
}: CategoryCardHeaderProps) {
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

  return (
    <Group
      justify="space-between"
      p="xs"
      style={{
        // backgroundColor: "var(--mantine-primary-color-filled)",
        borderRadius: "0.9375rem 0.9375rem 0rem 0rem",
      }}
      bg={"var(--mantine-primary-color-filled)"}
    >
      <div></div>
      <Text fz="1.5rem" c="white" fw={700} tt={"capitalize"}>
        {category.name}
      </Text>
      <Group>
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel="Are you sure to delete this category?"
          headerTitle="Delete Category?"
          confirmLabel="Delete"
          onConfirm={(e) => {
            notifications.show({
              id: "delete-data-menu-category",
              loading: true,
              title: "Deleting category..",
              message: `Hold on, category is getting deleted...`,
              autoClose: false,
              withCloseButton: false,
            });
            handleDelete.mutate(category?.id);
            closeDialog();
          }}
        />
        <Button
          c={"var(--mantine-primary-color-filled)"}
          bg={"white"}
          rightSection={<IconPlus />}
          onClick={openCreateItem}
          radius={"lg"}
        >
          Add
        </Button>
        <ActionIconCommon handleClick={() => handleEdit(category)} label="Edit">
          <IconEdit size={18} />
        </ActionIconCommon>
        <ActionIconCommon handleClick={toggle} label="Delete">
          <IconTrash size={18} />
        </ActionIconCommon>
        <Stack pr={"sm"}>
          <ActionIconCommon handleClick={toggleSwapOrder} label="Swap Order">
            <IconReplace size={18} />
          </ActionIconCommon>
        </Stack>
      </Group>
    </Group>
  );
}
