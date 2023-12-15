import { Badge, Group, Menu, Paper, Stack, Text, Title } from "@mantine/core";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useContactDeleteMutation } from "../../backend/campaign/contacts/contacts.query";
import { useTeamsByUser } from "../../backend/team/team.query";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../Modal/FormModalLayout";
import EditContactModal from "../../pages/dashboard/contacts/EditContactModal";
import dayjs from "dayjs";

interface ContactCardProps {
  contact: ContactsData;
  groupId?: string;
}

const ContactCard = ({ contact, groupId }: ContactCardProps) => {
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
    return team?.id === contact?.teamId;
  });

  return (
    <Paper shadow="xl" radius="md" p="xl">
      <Group justify="space-between">
        <Title order={5}>{contact?.name}</Title>
        <ContactMenu contact={contact} groupId={groupId}></ContactMenu>
      </Group>
      <Text c="dimmed">{contact?.phone}</Text>
      <Text c="dimmed">{contact?.email}</Text>

      <Group justify="space-between">
        <Text c="dimmed">
          created on {dayjs(contact?.createdAt).format("DD-MM-YYYY")}
        </Text>
        <Badge color="var(--tertiary-color)" variant="outline" size="lg">
          {teamObj?.name}
        </Badge>
      </Group>
    </Paper>
  );
};

const ContactMenu = ({ contact, groupId }) => {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
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
    <Menu shadow="xl" position="bottom-end">
      <Menu.Target>
        <IconDots color="grey"></IconDots>
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
        />
      </FormModalLayout>
    </Menu>
  );
};

export default ContactCard;
