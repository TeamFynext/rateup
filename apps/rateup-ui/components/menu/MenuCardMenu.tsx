import { ActionIcon, Menu } from "@mantine/core";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useDeleteMenuMutation } from "../../backend/menu/menu.query";
import ConfirmationModal from "../Modal/ConfirmationModal";

type MenuCardMenuProps = {
  readonly menuId: string;
  readonly teamId: string;
  handleEditClick: any;
  menu: any;
};

function MenuCardMenu({
  menu,
  menuId,
  teamId,
  handleEditClick,
}: MenuCardMenuProps) {
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

  const deleteMutation = useDeleteMenuMutation(
    teamId,
    () => {},
    () => {},
  );
  const router = useRouter();

  return (
    <Menu offset={0} withArrow>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel="Are you sure to delete this Menu?"
        headerTitle="Delete Menu?"
        confirmLabel="Delete"
        onConfirm={(e) => {
          notifications.show({
            id: "delete-data-menu",
            loading: true,
            title: "Deleting menu..",
            message: `Hold on, menu is getting deleted...`,
            autoClose: false,
            withCloseButton: false,
          });
          deleteMutation.mutate(menuId);
          closeDialog();
        }}
      />
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          leftSection={<IconEdit size={16} />}
          onClick={() => handleEditClick(menu)}
        >
          Rename
        </Menu.Item>
        <Menu.Item
          leftSection={<IconShare size={16} />}
          onClick={() => {
            router.push(`/dashboard/menu/${menuId}?tab=Share`);
          }}
        >
          Share
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash size={16} />} onClick={toggle}>
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default MenuCardMenu;
