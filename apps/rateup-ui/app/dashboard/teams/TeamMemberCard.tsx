"use client";

import React, { useState } from "react";

import {
  ActionIcon,
  Badge,
  Button,
  CopyButton,
  Flex,
  Group,
  Menu,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCopy,
  IconDots,
  IconPencilMinus,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { getUserRoleLabel } from "@/utils";
import { FRONTEND_URL } from "@/utils/constants";

import {
  useDeleteInviteMutation,
  userResendInviteTeamMutation,
} from "../../../backend/team/team.query";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";
import { showErrorToast } from "../../../utils/notifications";
import { MemberEditFormModal } from "../members/page";

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
  const translations = useTranslations();
  return (
    <>
      <PaperLayout>
        <Stack h={"100%"}>
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
          <Flex justify={"space-between"}>
            <Flex gap={"xs"}>
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
                  {getUserRoleLabel(member?.role, translations)}
                </Badge>
              )}
              <Badge
                color={member.status === "PENDING" ? "yellow" : "green"}
                variant="light"
                p={"sm"}
              >
                {member.active ? "ACTIVE" : member?.status}
              </Badge>
            </Flex>
            {member.status === "PENDING" && (
              <CopyButton
                value={`${FRONTEND_URL}/invite?type=team&token=${member.id}`}
                timeout={2000}
              >
                {({ copied, copy }) => (
                  <Badge variant="light" radius={"sm"} tt={"capitalize"} pr={0}>
                    <Group p={0}>
                      <Text size="xs">Invite Link</Text>
                      <Tooltip
                        label={copied ? "Copied" : "Copy"}
                        withArrow
                        position="right"
                      >
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size={14} />
                          ) : (
                            <IconCopy size={14} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Badge>
                )}
              </CopyButton>
            )}
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
  const translations = useTranslations();
  if (deleteInviteMutation?.isPending || isPending) {
    notifications.show({
      id: deleteInviteMutation?.isPending
        ? "load-data-deleting"
        : "load-data-invitaion",
      loading: true,
      title: translations(
        deleteInviteMutation?.isPending
          ? "Deleting Invite"
          : "Resending Invitation",
      ),
      message: translations(
        deleteInviteMutation?.isPending
          ? "Hold on, Staff invite is getting deleted."
          : "Hold on, Team Invitation Resending",
      ),
      autoClose: false,
      withCloseButton: false,
    });
  }
  if (isError || deleteInviteMutation?.isError) {
    showErrorToast(
      translations(
        isError
          ? "Team Invitation Resend Failed"
          : "Team Invitation Deletion Failed",
      ),
      isError ? "load-data-invitaion" : "load-data-deleting",
      "",
      true,
    );
  }
  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon
          onClick={(e) => {
            e.stopPropagation();
          }}
          variant="subtle"
          color="gray"
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
            {translations("Resend Invite")}
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
            {translations("Delete Invite")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
