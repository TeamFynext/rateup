"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconUserEdit,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { getUserRoleLabel } from "@/utils";

import {
  useTeamsMembersOfOrg,
  useUpdateRoleMutation,
} from "../../../backend/org/org.query";
import {
  useUpdateActiveStatusMutation,
  useUpdateUserPause,
} from "../../../backend/user/user.query";
import { ContainedSelection } from "../../../components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";

const Members = () => {
  const router = useRouter();
  const { user } = useUser();
  const [memberModalOpenedId, setMemberModalOpenedId] = useState("");

  if (user?.role === "ADMIN" || user?.role === "MEMBER") {
    router.push("/dashboard");
  }

  const {
    isLoading: isLoadingTeamsUser,
    data: membersData,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsMembersOfOrg() as UseMembersResult;

  // onChange={(value) => onChangeRole(member?.id, value)}
  return (
    <Stack m={"xs"}>
      <Group justify="space-between">
        {/* <ContainedTextField
          placeholder={translations("Search in all members")}
          disabled
          style={{ flex: 1 }}
        />
        <ContainedSelection disabled placeholder={translations("Sort")} /> */}
      </Group>
      <PaperLayout>
        {isLoadingTeamsUser ? (
          <Loader type="bars" />
        ) : (
          <Stack>
            {membersData?.data?.map(
              ({ email, id, role, teams, name, isPaused }, i: number) => (
                <>
                  <LongMemberCard
                    key={id}
                    openModal={() => setMemberModalOpenedId(id)}
                    member={{
                      id: id,
                      email: email,
                      name: name,
                      role: role,
                      isPaused,
                    }}
                    teams={teams}
                  />
                  {i !== membersData?.data?.length - 1 && <Divider />}
                </>
              ),
            )}
            {memberModalOpenedId && (
              <MemberEditFormModal
                id={memberModalOpenedId}
                onClose={() => setMemberModalOpenedId("")}
                member={membersData?.data?.find(
                  (m) => m.id === memberModalOpenedId,
                )}
              />
            )}
          </Stack>
        )}
      </PaperLayout>
    </Stack>
  );
};

//small member card starts here (for member modal)
const SmallMemberCard = ({
  member,
}: {
  member: { name: string; role: string; email: string };
}) => {
  const translations = useTranslations();
  return (
    <Group justify="space-between">
      <Stack gap={0}>
        <Text size="xl" fw={900}>
          {member?.name}
        </Text>
        <Text size="xs" fw={"bolder"} c={"dimmed"}>
          {member?.email}
        </Text>
      </Stack>
      <Badge
        color={
          member?.role === UserRole.SUPADM
            ? "red"
            : member?.role === UserRole.ADM
              ? "orange"
              : "green"
        }
        variant="light"
        size="lg"
      >
        {translations("Active")}
      </Badge>
    </Group>
  );
};
//small member card ends here

//member modal starts here
export const MemberEditFormModal = ({
  id,
  onClose,
  member,
}: {
  id: string;
  onClose: () => void;
  member: { id: string; name: string; role: string; email: string };
}) => {
  const [newRole, setNewRole] = React.useState(member?.role);
  const updateRole = useUpdateRoleMutation();
  const { user } = useUser();
  const translations = useTranslations();
  function onChangeRole(id: string, role: string) {
    const data = { memberId: id, body: { role: role } };
    updateRole.mutate(data);
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Updating role"),
      message: translations("Hold on, your changes are getting updated..."),
      autoClose: false,
      withCloseButton: false,
    });
    onClose();
  }

  return (
    <FormModalLayout
      centered
      includeCancelButton
      opened={id !== ""}
      onClose={onClose}
      title={translations("Edit Staff")}
      buttonTitle={translations("Save")}
      onSubmit={() => onChangeRole(member?.id, newRole)}
    >
      <Stack gap={"xl"}>
        <SmallMemberCard member={member} />
        <Group justify="space-between">
          <Text fw={900}>{translations("Change Role")}</Text>
          <ContainedSelection
            placeholder={translations("Select Role")}
            disabled={user.role !== "SUPER_ADMIN" || member.id === user.userId}
            defaultValue={member?.role}
            data={[
              { value: UserRole.SUPADM, label: translations("Super Admin") },
              { value: UserRole.ADM, label: translations("Admin") },
              { value: UserRole.MEMBER, label: translations("Staff") },
            ]}
            onChange={(value) => setNewRole(value)}
          />
        </Group>
      </Stack>
    </FormModalLayout>
  );
};
//member modal ends here

//long member card starts here
const LongMemberCard = ({
  member,
  openModal,
  teams,
}: {
  member: {
    id: string;
    name: string;
    role: string;
    email: string;
    isPaused: boolean;
  };
  teams: Team[];
  openModal?: () => void;
}) => {
  const [modalOpened, { close, open, toggle }] = useDisclosure();
  const [pauseModalOpened, { open: openPauseModal, close: closePauseModal }] =
    useDisclosure();
  const { user } = useUser();
  const translations = useTranslations();
  const updateStatus = useUpdateActiveStatusMutation();
  const updatePauseStatus = useUpdateUserPause();
  function onUpdateStatus() {
    updateStatus.mutate(member?.id);
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Deleting User"),
      message: translations("Hold on, your changes are getting updated..."),
      autoClose: false,
      withCloseButton: false,
    });
    close();
  }

  const handleUserStatus = () => {
    const data = {
      isPaused: !member.isPaused,
      pausedBy: "org",
    };
    updatePauseStatus.mutate({ userId: member.id, data });
  };
  return (
    <>
      <Group justify="space-between">
        <Stack miw={250} gap={5}>
          <Group>
            <Text size="xl" fw={900}>
              {member?.name}
            </Text>
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
          </Group>
          <Text size="xs" c={"dimmed"}>
            {member?.email}
          </Text>
          {member.isPaused && (
            <Badge color="red">{translations("Paused")}</Badge>
          )}
        </Stack>
        <Stack style={{ flex: 1 }} gap={5}>
          <Text size="xs" fw={400} c={"dimmed"}>
            {translations("Teams joined")} :
          </Text>
          <ScrollArea
            style={{ flex: 1 }}
            scrollbarSize={1}
            offsetScrollbars={"x"}
            miw={250}
          >
            <Group style={{ flex: 1 }} justify="flex-start" wrap="nowrap">
              {teams.map(({ team_code, team_id, team_name }) => (
                <Badge key={team_id} variant="outline">
                  {team_code}
                </Badge>
              ))}
            </Group>
          </ScrollArea>
        </Stack>
        <Group>
          <Tooltip
            label={translations("Edit staff role")}
            position="top"
            withArrow
          >
            <Button
              size="compact-md"
              onClick={openModal}
              disabled={user.userId === member.id}
            >
              <IconUserEdit size={15} />
            </Button>
          </Tooltip>
          <Tooltip
            label={translations("Delete Staff")}
            position="top"
            withArrow
          >
            <Button
              size="compact-md"
              color="red"
              disabled={user.userId === member.id}
              onClick={open}
            >
              <IconTrash size={15} />
            </Button>
          </Tooltip>
          <Tooltip
            label={
              member.isPaused
                ? translations("Resume Staff")
                : translations("Pause staff")
            }
            position="top"
            withArrow
          >
            <Button
              size="compact-md"
              onClick={openPauseModal}
              disabled={user.userId === member.id}
            >
              {member.isPaused ? (
                <IconPlayerPlay size={"1rem"} />
              ) : (
                <IconPlayerPause size={"1rem"} />
              )}
            </Button>
          </Tooltip>
        </Group>
      </Group>
      <ConfirmationModal
        forDeleteFunctionality
        opened={modalOpened}
        confirmLabel={translations("Delete")}
        headerTitle={translations("Delete Staff")}
        headerLabel={translations("Are you sure to delete this team staff?")}
        onConfirm={onUpdateStatus}
        onClose={close}
      />
      <ConfirmationModal
        opened={pauseModalOpened}
        confirmLabel="Yes"
        headerTitle={
          member?.isPaused
            ? translations("Resume User")
            : translations("Pause User")
        }
        headerLabel={`${translations("Are you sure to")} ${member?.isPaused ? translations("resume") : translations("pause")}  ${translations("this user?")}`}
        onConfirm={handleUserStatus}
        onClose={closePauseModal}
      />
    </>
  );
};
//long member card ends here
export default Members;
