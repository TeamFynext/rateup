import React, { useState, useEffect } from "react";
import {
  Flex,
  Text,
  Badge,
  Menu,
  ActionIcon,
  Stack,
  Title,
  Button,
  Group,
} from "@mantine/core";
import {
  IconCheck,
  IconDots,
  IconPencilMinus,
  IconTrash,
} from "@tabler/icons-react";
import { deleteInviteById } from "../../../backend/team/team.api";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../../context/UserContext";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { MemberEditFormModal } from "../members";
import { UserRole } from "../../../utils/enums";

const TeamMemberCard = ({
  member,
}: {
  member: {
    id: string;
    name: string;
    email: string;
    role?: string;
    status?: string;
    active?: boolean;
  };
}) => {
  const { user } = useUser();
  const [memberModalOpenId, setMemberModalOpenedId] = useState("");
  return (
    <>
      <PaperLayout mih={170} mah={170}>
        <Stack justify="space-between" h={"100%"}>
          <Flex justify={"space-between"} align={"center"}>
            <Stack gap={1}>
              <Title order={3}>{member.name}</Title>
              <Text mr={"sm"} truncate fw={600} c="gray" size="sm">
                {member.email}
              </Text>
            </Stack>
            {member?.status === "PENDING" ? (
              <TeamMemberMenu status={member?.status} inviteId={member.id} />
            ) : (
              <Button
                size="compact-sm"
                ml={5}
                disabled={
                  user.role !== "SUPER_ADMIN" || member.id === user.userId
                }
                variant="subtle"
                onClick={() => setMemberModalOpenedId(member.id)}
              >
                <IconPencilMinus size={15} />
              </Button>
            )}
          </Flex>
          <Flex align={"center"} justify={"space-between"}>
            {member?.role && (
              <Badge
                color={
                  member?.role === UserRole.SUPADM
                    ? "red"
                    : member?.role === UserRole.ADM
                    ? "orange"
                    : "green"
                }
                variant="dot"
                size="sm"
              >
                {member?.role}
              </Badge>
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
      <MemberEditFormModal
        id={memberModalOpenId}
        onClose={() => setMemberModalOpenedId("")}
        member={{
          email: member.email,
          id: member.id,
          name: member.name,
          role: member?.role,
        }}
        key={member.id}
      />
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
