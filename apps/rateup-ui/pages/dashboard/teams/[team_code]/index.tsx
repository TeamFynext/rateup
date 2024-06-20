import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Tabs,
  Loader,
  Stack,
  SimpleGrid,
  Box,
  Space,
  Text,
  Group,
  Center,
} from "@mantine/core";
import {
  RateupButtonBlue,
  RateupButtonOutline,
} from "../../../../components/Button/RateupButtons";
import { IconCheck, IconReload } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import validateNameAndEmail from "../validation";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { getOrgIdRole, getUserID } from "../../../../utils/userInfo";
import { inviteTeamMember } from "../../../../backend/team/team.api";
import StyledTabs from "../../../../components/styled/StyledTabs/StyledTabs";
import TeamMemberCard from "../TeamMemberCard";
import { IconPlus } from "@tabler/icons-react";
import { useRouteParams } from "../../../../context/RouteParamsContext";
import TeamSettings from "../TeamSettings";
import {
  useTeamMembersFromInvitation,
  useTeamsByUser,
} from "../../../../backend/team/team.query";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";
import Heading from "../../../../components/styled/Heading/Heading";
import styles from "./teams.module.css";
import TeamCard from "../TeamCard";

const TeamDetails = () => {
  const router = useRouter();
  const { team_code } = router.query;
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sort, setSort] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();
  const { update } = useRouteParams();
  //fecthing teams data
  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: refetchTeams,
  } = useTeamsByUser() as UseTeamsByUserResult;
  let teamsData = teamsDataUser?.data;
  let teamCode: string = team_code?.toString();
  let teamID = getTeamIdByCode(teamsData, teamCode);
  //fetching team members data from invitation
  const {
    isLoading: isLoadingMembers,
    data: teamsMembersData,
    refetch: refetchInvitedTeamMembers,
    error: teamsMembersError,
  } = useTeamMembersFromInvitation(teamID);
  enum TabEnum {
    Members = "Members",
    Survey = "Survey",
    Settings = "Settings",
  }
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Members);

  const handleMemberInvite = async () => {
    const { orgId } = await getOrgIdRole();
    const { userId } = await getUserID();
    let teamId: string = teamID?.toString();
    let type = "TEAM";
    const data = { name, email, orgId, type, teamId, invitedBy: userId };
    return inviteTeamMember(data);
  };

  const addResourceMutation = useMutation({
    mutationFn: () => handleMemberInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }), //update team list on add
        notifications.update({
          id: "load-data",
          color: "teal",
          title: "Success",
          loading: false,
          message: "Invite sent successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
      close();
      refetchInvitedTeamMembers();
    },

    onError: (error: any) => {
      console.error("Error creating invite:", error?.response?.data);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error?.response?.data?.message || error.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });

  useEffect(() => {
    update({ team_code: teamsMembersData?.teamName });
  }, [teamsMembersData]);

  const handleSubmit = async (e) => {
    const validationErrors = validateNameAndEmail(name, email);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    } else {
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Sending Invite..",
        message: `Hold on, Sending invite to  '${name}'.`,
        autoClose: false,
        withCloseButton: true,
      });
    }

    addResourceMutation.mutate();
  };

  useEffect(() => {
    setErrors({});
  }, [name, email]);

  useEffect(() => {
    setName("");
    setEmail("");
  }, [opened]);

  const teamMembersObjArr = [
    ...(teamsMembersData?.invitations || []),
    ...(teamsMembersData?.members || []),
  ];

  return (
    <>
      <FormModalLayout
        centered
        opened={opened}
        onClose={close}
        title="Add Member"
        buttonTitle="Add member"
        onSubmit={handleSubmit}
      >
        <Box>
          <ContainedTextField
            required
            label="Name"
            placeholder="Enter name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {errors.name && <Text c="red">*{errors.name}</Text>}
          <Space h="lg" />
          <ContainedTextField
            required
            label="Email"
            placeholder="Enter email id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {errors.email && <Text c="red">*{errors.email}</Text>}
        </Box>
      </FormModalLayout>
      <StyledTabs
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as TabEnum)}
      >
        <Stack gap={10}>
          <Tabs.List>
            <Tabs.Tab value={TabEnum.Members}>Members</Tabs.Tab>
            <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
          </Tabs.List>
        </Stack>
        <Tabs.Panel value={TabEnum.Members} h={"100%"}>
          <Stack h={"100%"} style={{ overflow: "hidden" }}>
            <Group>
              <Group style={{ marginTop: "auto", marginBottom: "auto" }}>
                <Heading
                  title={teamsMembersData?.teamName || "Team"}
                  titleprops={{ w: "fit-content" }}
                />
              </Group>
              <RateupButtonBlue
                title="Add Member"
                rightIcon={<IconPlus />}
                onClick={open}
              />
            </Group>

            {isLoadingMembers ? (
              <Center h={"100%"}>
                <Loader type="bars" />
              </Center>
            ) : teamsMembersError ? (
              <Center h={"100%"}>
                <Stack>
                  <p>Error... Try Refreshing...</p>
                  <RateupButtonOutline
                    onClick={refetchInvitedTeamMembers}
                    rightIcon={<IconReload size="1rem" />}
                    title="Refresh"
                    size="xs"
                  />
                </Stack>
              </Center>
            ) : teamMembersObjArr.length ? (
              <Box
                className={`${styles["cards-container"]} cards-grid-global-class`}
              >
                {teamMembersObjArr.map((member, i) => {
                  return (
                    <TeamMemberCard key={i} member={member} teamID={teamID} />
                  );
                })}
              </Box>
            ) : (
              <Center h={"100%"}></Center>
            )}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value={TabEnum.Settings} mt={60}>
          <Heading
            title={teamsMembersData?.teamName || "Team"}
            titleprops={{ w: "fit-content" }}
          />

          <TeamSettings
            id={teamID?.toString()}
            teamData={{
              code: teamsMembersData?.code,
              googleLink: teamsMembersData?.googleLink,
              name: teamsMembersData?.teamName,
              id: teamsMembersData?.teamId,
              tags: teamsMembersData?.tags,
            }}
          />
        </Tabs.Panel>
      </StyledTabs>
    </>
  );
};

export default TeamDetails;

export function getTeamIdByCode(teamsData: Array<TeamData>, code: string) {
  let teamId = "";
  teamsData?.forEach((team) => {
    if (team.code === code) {
      teamId = team.id;
    }
  });
  return teamId;
}
