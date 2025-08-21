import { useRouter } from "next/router";

import { Box, Menu, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconChevronDown, IconEdit, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { PAGE_SIZE } from "@/utils/constants";

import {
  useContactGroupById,
  useDeleteGroupMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContactDeleteMutation } from "../../backend/campaign/contacts/contacts.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import CreateGroupModal from "../Contacts/CreateGroupModal";
import EditContactModal from "../Contacts/EditContactModal";
import FormModalLayout from "../Modal/FormModalLayout";

export const ContactMenu = ({ contact, groupId, tags }) => {
  const translations = useTranslations();
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: translations("Delete contact"),
      centered: true,
      children: (
        <Text size="sm">
          {translations("Are you sure you want to delete this contact?")}
        </Text>
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
            title={translations("Select action")}
            variant="light"
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
          {translations("Edit")}
        </Menu.Item>

        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size="1rem" />}
          onClick={openDeleteModal}
        >
          {translations("Delete contact")}
        </Menu.Item>
      </Menu.Dropdown>
      <FormModalLayout
        opened={openedEditModal}
        title={translations("Edit Contact")}
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

export const ContactGroupMenu = ({ groupId }) => {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const { data } = useContactGroupById(groupId?.toString(), openedEditModal, {
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const deleteGroupMutation = useDeleteGroupMutation();
  const router = useRouter();
  const translations = useTranslations();
  const openDeleteModal = (e) => {
    e.stopPropagation();
    modals.openConfirmModal({
      title: translations("Delete Group"),
      centered: true,
      children: (
        <Text size="sm">
          {translations(
            "Are you sure you want to delete this group? This action is destructive and you will have to contact support to restore your data.",
          )}
        </Text>
      ),
      labels: { confirm: translations("Ok"), cancel: translations("cancel") },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContactGroup(),
    });
  };
  const deleteContactGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        router.push("/dashboard/contacts?tab=groups");
      },
    });
  };
  return (
    <Menu shadow="xl" position="bottom-start">
      <Menu.Target>
        <Box
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <RateupButtonPrimary
            title={translations("Select action")}
            variant="light"
            rightIcon={<IconChevronDown size="1rem" />}
            size="xs"
          />
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit size={"1rem"} />}
          onClick={(e) => {
            e.stopPropagation();
            openEditModal();
          }}
        >
          {translations("Edit")}
        </Menu.Item>

        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size="1rem" />}
          onClick={openDeleteModal}
        >
          {translations("Delete contact Group")}
        </Menu.Item>
      </Menu.Dropdown>
      <FormModalLayout
        centered
        title={translations("Edit Group")}
        opened={openedEditModal}
        onClose={closeEditModal}
        size="lg"
      >
        <CreateGroupModal
          groupClose={closeEditModal}
          isEdit={true}
          groupDetails={data}
        />
      </FormModalLayout>
    </Menu>
  );
};
