import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useContactDeleteMutation } from "../../backend/campaign/contacts/contacts.query";
import { useTeamsByUser } from "../../backend/team/team.query";

interface ContactCardProps {
  contact: ContactsData;
  groupId?: string;
}

const ContactCard = ({ contact, groupId }: ContactCardProps) => {
  const createdAt = new Date(contact?.createdAt);
  const date =
    createdAt.getDate() +
    "-" +
    (createdAt.getMonth() + 1) +
    "-" +
    createdAt.getFullYear();

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser() as {
    isLoading: boolean;
    error: any;
    data: TeamsResponse;
    refetch: any;
  };

  const teamObj = teamsData?.data?.find((team) => {
    return team?.teamId === contact?.teamId;
  });
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Delete contact",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this customer contact? This action is
          destructive and you will have to contact support to restore your data.
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
    <Paper shadow="xl" radius="md" p="xl">
      <Group justify="space-between">
        <Title order={5}>{contact?.name}</Title>
        <IconTrash
          size={24}
          color="#FF6464"
          onClick={openDeleteModal}
        ></IconTrash>
      </Group>
      <Text c="dimmed">{contact?.phone}</Text>
      <Text c="dimmed">{contact?.email}</Text>

      <Group justify="space-between">
        <Text c="dimmed">created on {date}</Text>
        <Badge color="var(--tertiary-color)" variant="outline" size="lg">
          {teamObj?.teamName}
        </Badge>
      </Group>
    </Paper>
  );
};

export default ContactCard;
