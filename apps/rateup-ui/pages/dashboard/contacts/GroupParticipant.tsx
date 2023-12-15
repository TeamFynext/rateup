import { Paper, Group, Title, Text, Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDots, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRemoveContactsFromGroup } from "../../../backend/campaign/contactGroup/contactGroup.query";

const GroupParticipant = ({ contact, groupId }) => {
  return (
    <Paper shadow="xl" radius="md" p="xl">
      <Group justify="space-between">
        <Title order={5}>{contact?.name}</Title>
        <ParticipantMenu
          contactId={contact?.id}
          groupId={groupId}
        ></ParticipantMenu>
      </Group>
      <Text c="dimmed">{contact?.phone}</Text>
      <Text c="dimmed">{contact?.email}</Text>

      <Group justify="space-between">
        <Text c="dimmed">
          created on {dayjs(contact?.createdAt).format("DD-MM-YYYY")}
        </Text>
      </Group>
    </Paper>
  );
};

const ParticipantMenu = ({ contactId, groupId }) => {
  const removeContactsMutation = useRemoveContactsFromGroup(groupId);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Remove customer",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove this customer from group? This action
          is destructive and you will have to contact support to restore your
          data.
        </Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () =>
        removeContactsMutation.mutate({ contactIds: [contactId], groupId }),
    });
  };

  return (
    <Menu shadow="xl" position="bottom-end">
      <Menu.Target>
        <IconDots color="grey"></IconDots>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size="1rem" />}
          onClick={openDeleteModal}
        >
          Remove customer
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default GroupParticipant;
