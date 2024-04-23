import { Badge, Group, Menu, Stack, Text, Title } from "@mantine/core";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useContactDeleteMutation } from "../../backend/campaign/contacts/contacts.query";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../Modal/FormModalLayout";
import EditContactModal from "../Contacts/EditContactModal";
import dayjs from "dayjs";
import PaperLayout from "../styled/Layouts/PaperLayout";

interface ContactCardProps {
  contact: ContactsData;
  groupId?: string;
  tags?: string[];
}

const ContactCard = ({ contact, groupId, tags }: ContactCardProps) => {
  return (
    <PaperLayout p="xl">
      <Stack h={"100%"}>
        <Group justify="space-between">
          <Title order={5}>{contact?.name}</Title>
          <ContactMenu contact={contact} groupId={groupId} tags={tags} />
        </Group>
        <Stack gap={0}>
          <Text c="dimmed">{contact?.phone}</Text>
          <Text c="dimmed">{contact?.email}</Text>
        </Stack>
        <Group justify="space-between" mt={"auto"}>
          <Text c="dimmed">
            created on {dayjs(contact?.createdAt).format("DD-MM-YYYY")}
          </Text>
          <Badge size="md" variant="light" color="green" mt={"auto"}>
            source: {contact?.source ?? "NA"}
          </Badge>
        </Group>
      </Stack>
    </PaperLayout>
  );
};

const ContactMenu = ({ contact, groupId, tags }) => {
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
    <Menu shadow="xl" position="bottom-end">
      <Menu.Target>
        <IconDots color="grey" cursor={"pointer"} />
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

export default ContactCard;
