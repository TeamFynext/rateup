import { Group, Title, Text, Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconChevronDown, IconDots, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRemoveContactsFromGroup } from "../../backend/campaign/contactGroup/contactGroup.query";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { RateupButtonPrimary } from "../Button/RateupButtons";

const GroupParticipant = ({ contact, groupId }) => {
  return (
    <PaperLayout p="xl">
      <Group justify="space-between">
        <Title order={5}>{contact?.name}</Title>
        <ParticipantMenu contactId={contact?.id} groupId={groupId} />
      </Group>
      <Text c="dimmed">{contact?.phone}</Text>
      <Text c="dimmed">{contact?.email}</Text>

      <Group justify="space-between">
        <Text c="dimmed">
          created on {dayjs(contact?.createdAt).format("DD-MM-YYYY")}
        </Text>
      </Group>
    </PaperLayout>
  );
};

export const ParticipantMenu = ({ contactId, groupId }) => {
  const removeContactsMutation = useRemoveContactsFromGroup(groupId, () => {});
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Remove member",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove this member from group?
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
    <RateupButtonPrimary
      title="Remove member"
      variant="light"
      size="xs"
      onClick={openDeleteModal}
    />
  );
};

export default GroupParticipant;
