import { Box, Menu, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconChevronDown, IconEdit, IconTrash } from "@tabler/icons-react";
import { useContactDeleteMutation } from "../../backend/campaign/contacts/contacts.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import EditContactModal from "../Contacts/EditContactModal";
import FormModalLayout from "../Modal/FormModalLayout";

export const ContactMenu = ({ contact, groupId, tags }) => {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Delete contact",
      centered: true,
      children: (
        <Text size="sm">Are you sure you want to delete this contact?</Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContact(),
    });
  };

  const deleteMutation = useContactDeleteMutation(groupId);

  const deleteContact = () => {
    deleteMutation.mutate(contact?.id);
  };
  return (
    <Menu shadow="xl" position="bottom-start">
      <Menu.Target>
        <Box>
          <RateupButtonPrimary
            title="Select action"
            variant="outline"
            rightIcon={<IconChevronDown size="1rem" />}
            size="xs"
          />
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit size={"1rem"}></IconEdit>}
          onClick={openEditModal}
        >
          Edit
        </Menu.Item>

        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size="1rem" />}
          onClick={openDeleteModal}
        >
          Delete contact
        </Menu.Item>
      </Menu.Dropdown>
      <FormModalLayout
        opened={openedEditModal}
        title="Edit Contact"
        onClose={closeEditModal}
        centered
        size="lg"
      >
        <EditContactModal
          contact={contact}
          closeEditModal={closeEditModal}
          groupId={groupId}
          tags={tags}
        />
      </FormModalLayout>
    </Menu>
  );
};
