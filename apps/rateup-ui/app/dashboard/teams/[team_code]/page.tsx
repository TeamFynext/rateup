"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  Box,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Space,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlus, IconReload } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { inviteTeamMember } from "../../../../backend/team/team.api";
import {
  useTeamMembersFromInvitation,
  useTeamsByUser,
} from "../../../../backend/team/team.query";
import {
  RateupButtonBlue,
  RateupButtonOutline,
} from "../../../../components/Button/RateupButtons";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import Heading from "../../../../components/styled/Heading/Heading";
import StyledTabs from "../../../../components/styled/StyledTabs/StyledTabs";
import { useRouteParams } from "../../../../context/RouteParamsContext";
import validateNameAndEmail from "../../../../utils/team/validation";
import { getOrgIdRole, getUserID } from "../../../../utils/userInfo";
import TeamCard from "../TeamCard";
import TeamMemberCard from "../TeamMemberCard";
import TeamSettings from "../TeamSettings";
import styles from "./teams.module.css";

const TeamDetails = () => {
  const params = useParams();
  const team_code = params?.team_code as string;

  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sort, setSort] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const translations = useTranslations();
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
  let teamCode: string = decodeURIComponent(team_code);
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
    return (await inviteTeamMember(data)).data;
  };

  const addResourceMutation = useMutation({
    mutationFn: () => handleMemberInvite(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }), //update team list on add
        notifications.update({
          id: "load-data",
          color: "teal",
          title: translations("success"),
          loading: false,
          message: data?.existing
            ? translations("staff added successfully")
            : translations("Invite sent successfully"),
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
        title: translations("Failed"),
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
    const validationErrors = validateNameAndEmail(name, email, translations);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    } else {
      notifications.show({
        id: "load-data",
        loading: true,
        title: translations("Sending Invite"),
        message: `${translations("Hold on, Sending invite to")} '${name}'.`,
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
        title={translations("Add Staff")}
        buttonTitle={translations("Add Staff")}
        onSubmit={handleSubmit}
      >
        <Box>
          <ContainedTextField
            required
            label={translations("Name")}
            placeholder={translations("Enter name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {errors.name && <Text c="red">*{errors.name}</Text>}
          <Space h="lg" />
          <ContainedTextField
            required
            label={translations("Email")}
            placeholder={translations("Enter email id")}
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
            <Tabs.Tab value={TabEnum.Members}>{translations("Staff")}</Tabs.Tab>
            <Tabs.Tab value={TabEnum.Settings}>
              {" "}
              {translations("Settings")}
            </Tabs.Tab>
          </Tabs.List>
        </Stack>
        <Tabs.Panel value={TabEnum.Members} h={"100%"}>
          <Stack h={"100%"} style={{ overflow: "hidden" }}>
            <Group>
              <Group style={{ marginTop: "auto", marginBottom: "auto" }}>
                <Heading
                  title={teamsMembersData?.teamName || translations("Team")}
                  titleprops={{ w: "fit-content" }}
                />
              </Group>
              <RateupButtonBlue
                title={translations("Add Staff")}
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
                  <p> {translations("Error Try Refreshing")}</p>
                  <RateupButtonOutline
                    onClick={refetchInvitedTeamMembers}
                    rightIcon={<IconReload size="1rem" />}
                    title={translations("Refresh")}
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
            title={teamsMembersData?.teamName || translations("Team")}
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
