import React, { useState } from "react";
import { useUser } from "../../../context/UserContext";
import { useRouter } from "next/router";
import {
  Stack,
  Loader,
  Text,
  Group,
  Button,
  Badge,
  ScrollArea,
  Divider,
} from "@mantine/core";
import {
  useTeamsMembersOfOrg,
  useUpdateRoleMutation,
} from "../../../backend/org/org.query";
import { notifications } from "@mantine/notifications";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import Heading from "../../../components/styled/Heading/Heading";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { UserRole } from "../../../utils/enums";
import { IconTrash, IconUserEdit } from "@tabler/icons-react";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { useUpdateActiveStatusMutation } from "../../../backend/user/user.query";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { lexend400 } from "../../../utils/fonts";

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
    <Stack>
      <Group justify="space-between">
        <Heading title="Members" />
        <ContainedTextField
          placeholder="Search in all members"
          disabled
          style={{ flex: 1 }}
        />
        <ContainedSelection disabled placeholder="Sort" />
      </Group>
      <PaperLayout>
        {isLoadingTeamsUser ? (
          <Loader />
        ) : (
          <Stack>
            {membersData?.data?.map(
              ({ email, id, role, teams, name }, i: number) => (
                <>
                  <LongMemberCard
                    key={id}
                    openModal={() => setMemberModalOpenedId(id)}
                    member={{ id: id, email: email, name: name, role: role }}
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
        Active
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
  function onChangeRole(id: string, role: string) {
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
    onClose();
  }

  return (
    <FormModalLayout
      centered
      includeCancelButton
      opened={id !== ""}
      onClose={onClose}
      title="Edit Member"
      buttonTitle="Save"
      onSubmit={() => onChangeRole(member?.id, newRole)}
    >
      <Stack gap={"xl"}>
        <SmallMemberCard member={member} />
        <Group justify="space-between">
          <Text fw={900}>Change Role</Text>
          <ContainedSelection
            placeholder="Select Role"
            disabled={user.role !== "SUPER_ADMIN" || member.id === user.userId}
            defaultValue={member?.role}
            data={[
              { value: UserRole.SUPADM, label: "Super Admin" },
              { value: UserRole.ADM, label: "Admin" },
              { value: UserRole.MEMBER, label: "Member" },
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
  member: { id: string; name: string; role: string; email: string };
  teams: Team[];
  openModal?: () => void;
}) => {
  const [modalOpened, { close, open, toggle }] = useDisclosure();
  const { user } = useUser();
  const updateStatus = useUpdateActiveStatusMutation();
  function onUpdateStatus() {
    updateStatus.mutate(member?.id);
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Deleting User..",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });
    close();
  }
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
              {member?.role}
            </Badge>
          </Group>
          <Text size="xs" c={"dimmed"}>
            {member?.email}
          </Text>
        </Stack>
        <Stack style={{ flex: 1 }} gap={5}>
          <Text size="xs" c={"dimmed"} className={lexend400.className}>
            Teams joined :
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
          <Button
            size="compact-md"
            onClick={openModal}
            disabled={user.userId === member.id}
          >
            <IconUserEdit size={15} />
          </Button>
          <Button
            size="compact-md"
            color="red"
            disabled={user.userId === member.id}
            onClick={open}
          >
            <IconTrash size={15} />
          </Button>
        </Group>
      </Group>
      <ConfirmationModal
        forDeleteFunctionality
        opened={modalOpened}
        confirmLabel="Delete"
        headerTitle="Delete Member"
        headerLabel="Are you sure to delete this team Member?"
        onConfirm={onUpdateStatus}
        onClose={close}
      />
    </>
  );
};
//long member card ends here
export default Members;
