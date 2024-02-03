import { ActionIcon, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconReplace } from "@tabler/icons-react";
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
        backgroundColor: "var(--tertiary-color)",
        borderRadius: "0.9375rem 0.9375rem 0rem 0rem",
      }}
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
          <Tooltip label="Edit">
            <IconEdit />
          </Tooltip>
        </ActionIcon>
        <ActionIconCommon handleClick={toggle} />

        <Stack pr={"sm"}>
          <ActionIcon
            variant={"transparent"}
            c={"white"}
            onClick={toggleSwapOrder}
          >
            <Tooltip label="Swap Order">
              <IconReplace />
            </Tooltip>
          </ActionIcon>
        </Stack>
      </Group>
    </Group>
  );
}
