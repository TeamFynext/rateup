import React, { useState } from "react";
import {
  Flex,
  Text,
  Badge,
  Menu,
  ActionIcon,
  Stack,
  Title,
  Button,
} from "@mantine/core";
import {
  IconDots,
  IconPencilMinus,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useUser } from "../../../context/UserContext";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { MemberEditFormModal } from "../members";
import { UserRole } from "../../../utils/enums";
import {
  useDeleteInviteMutation,
  userResendInviteTeamMutation,
} from "../../../backend/team/team.query";
import { showErrorToast } from "../../../utils/notifications";

const TeamMemberCard = ({
  member,
  teamID,
}: {
  member: {
    id: string;
    name: string;
    email: string;
    role?: string;
    status?: string;
    active?: boolean;
  };
  teamID?: string;
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
              <TeamMemberMenu
                status={member?.status}
                inviteId={member.id}
                teamID={teamID}
              />
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

function TeamMemberMenu({ status, inviteId, teamID }) {
  const { mutate, isPending, isError } = userResendInviteTeamMutation();
  const deleteInviteMutation = useDeleteInviteMutation(teamID);
  if (deleteInviteMutation?.isPending || isPending) {
    notifications.show({
      id: deleteInviteMutation?.isPending
        ? "load-data-deleting"
        : "load-data-invitaion",
      loading: true,
      title: deleteInviteMutation?.isPending
        ? "Deleting Invite.."
        : "Resending Invitation..",
      message: deleteInviteMutation?.isPending
        ? "Hold on, Member invite is getting deleted."
        : "Hold on, Team Invitation Resending.",
      autoClose: false,
      withCloseButton: false,
    });
  }
  if (isError || deleteInviteMutation?.isError) {
    showErrorToast(
      isError
        ? "Team Invitation Resend Failed"
        : "Team Invitation Deletion Failed",
      isError ? "load-data-invitaion" : "load-data-deleting",
    );
  }
  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon
          color={"var(--tertiary-color)"}
          onClick={(e) => {
            e.stopPropagation();
          }}
          variant={"transparent"}
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
            leftSection={<IconSend />}
            onClick={(e) => {
              e.stopPropagation();
              // setDeleteInviteId(inviteId);
              mutate(inviteId);
            }}
          >
            Resend Invite
          </Menu.Item>
        )}
        {status === "PENDING" && (
          <Menu.Item
            leftSection={<IconTrash />}
            onClick={(e) => {
              e.stopPropagation();
              deleteInviteMutation?.mutate(inviteId);
            }}
          >
            Delete Invite
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
