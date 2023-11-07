import React, { useState, useEffect } from "react";
import {
  Flex,
  Paper,
  Text,
  Badge,
  Menu,
  ActionIcon,
  Stack,
  Title,
  Dialog,
  Button,
} from "@mantine/core";
import { IconCheck, IconDots, IconTrash } from "@tabler/icons-react";
import { deleteInviteById } from "../../../backend/team/team.api";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContainedSelection } from "../../../components/input/ContainedInput/ContainedInput";
import { UserRole } from "../../../utils/enums";
import { useUser } from "../../../context/UserContext";
import { useDisclosure } from "@mantine/hooks";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import Heading from "../../../components/styled/Heading/Heading";
import { useUpdateRoleMutation } from "../../../backend/org/org.query";

const TeamMemberCard = ({ member }) => {
  const { user } = useUser();
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);
  const [role, setRole] = useState(member.role);
  const updateRole = useUpdateRoleMutation();

  function onChangeRole(id: string = member.id) {
    const data = { memberId: id, body: { role: role } };
    updateRole.mutate(data);
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Updating role..",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });
    closeDialog();
  }
  return (
    <>
      <PaperLayout>
        <Stack justify="space-between" h={"100%"}>
          <Flex justify={"space-between"} align={"center"}>
            <Stack gap={1}>
              <Title order={2}>{member.name}</Title>
              <Text mr={"sm"} truncate fw={600} color="gray">
                {member.email}
              </Text>
            </Stack>
            {member.status === "PENDING" && (
              <TeamMemberMenu status={member.status} inviteId={member.id} />
            )}
          </Flex>
          <Flex align={"center"} justify={"space-between"}>
            {member.status !== "PENDING" && (
              <ContainedSelection
                disabled={
                  user.role !== "SUPER_ADMIN" || member.id === user.userId
                }
                defaultValue={member.role}
                radius={"xl"}
                data={[
                  { value: UserRole.SUPADM, label: "Super Admin" },
                  { value: UserRole.ADM, label: "Admin" },
                  { value: UserRole.MEMBER, label: "Member" },
                ]}
                onChange={(value) => {
                  setRole(value);
                  openDialog();
                }}
              />
            )}
            <Badge
              color={member.status === "PENDING" ? "yellow" : "green"}
              variant="light"
              p={"sm"}
              ml="auto"
            >
              {member.active ? "ACTIVE" : member?.status}
            </Badge>
          </Flex>
        </Stack>
      </PaperLayout>
      <Dialog opened={dialogOpened}>
        <Stack>
          <Heading
            subtitle="Change Member Role"
            label="Are you sure to change the role for this team member?"
          />
          <Button fw={100} onClick={() => onChangeRole()}>
            Save
          </Button>
        </Stack>
      </Dialog>
    </>
  );
};

export default TeamMemberCard;

function TeamMemberMenu({ status, inviteId }) {
  const [deleteInviteId, setDeleteInviteId] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    deleteInviteId && deleteInviteMutation.mutate();
    if (deleteInviteId) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Deleting Invite..",
        message: `Hold on, Member invite is getting deleted.`,
        autoClose: false,
        withCloseButton: false,
      });
    }
  }, [deleteInviteId]);

  const handleDeleteInvite = async () => {
    return deleteInviteById(deleteInviteId);
  };

  const deleteInviteMutation = useMutation({
    mutationFn: () => handleDeleteInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }), //update team list on delete
        notifications.update({
          id: "load-data",
          color: "teal",
          title: "Success",
          loading: false,
          message: "Invite deleted successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
      close();
      setDeleteInviteId("");
    },

    onError: (error: Error) => {
      console.error("Error :", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setDeleteInviteId("");
    },
  });

  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon
          color={"var(--tertiary-color)"}
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
        {status === "PENDING" && (
          <Menu.Item
            leftSection={<IconTrash />}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteInviteId(inviteId);
            }}
          >
            Delete Invite
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
