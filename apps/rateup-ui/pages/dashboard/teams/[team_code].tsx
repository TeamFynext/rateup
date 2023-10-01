import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Tabs, Paper, Loader, Stack, Title, Modal, SimpleGrid, Box, TextInput, Space, Text, Center, Flex, Group } from '@mantine/core';
import { RateupButtonOutline, RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import {IconCheck, IconReload } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import validateNameAndEmail from "./validation";
import { QueryClient, dehydrate, useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from '@tanstack/react-query'
import { getOrgIdRole, getUserID } from '../../../utils/userInfo';
import { getTeamMembersFromInvitation, inviteTeamMember } from '../../../backend/team/team.api';
import StyledTabs from '../surveys/StyledTabs';
import TeamMemberCard from './TeamMemberCard';
import { IconPlus } from '@tabler/icons-react';
import { backendConfig } from '../../../config/backendConfig';
import { getSessionWithRefreshHandling } from '../../../utils/auth/getSessionWithRefreshHandling';
import supertokensNode from 'supertokens-node'
import { fetchTeamsByUser, getTeamMembersFromInvite } from '../../../backend/ssr/team.api';
import { useRouteParams } from '../../../context/RouteParamsContext';
import TeamSettings from './TeamSettings';
import { useTeamsByUser } from '../../../backend/team/team.query';


const TeamDetails = () => {
  // TODO fix id fail case on page reload
  const router = useRouter();
  const { team_code  } = router.query;
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sort, setSort] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient()
  const { state, update } = useRouteParams();

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser(queryClient);

  let teamsData = teamsDataUser?.data?.data
  let teamCode : string = team_code?.toString();

  let team_id = getTeamIdByCode(teamsData, teamCode)

  enum TabEnum {
    Members = "Members",
    Survey = "Survey",
    Settings = "Settings",
  }
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Members);

  const handleMemberInvite = async () => {
        const { orgId } = await getOrgIdRole()
        const { userId } = await getUserID()
        let teamId : string = team_id?.toString();
        let type = "TEAM"
        const data = { name, email, orgId, type, teamId, invitedBy: userId }
        return inviteTeamMember(data)
    };

    const addResourceMutation = useMutation(() => handleMemberInvite(), {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamsDetailsQuery'] }),  //update team list on add
                notifications.update({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    loading: false,
                    message: 'Invite sent successfully.',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                });
            close()
            refetch()
        },

        onError: (error: any) => {
            console.error("Error creating invite:", error?.response?.data);
            notifications.update({
                id: 'load-data',
                color: 'red',
                loading: false,
                title: 'Failed',
                message: error?.response?.data?.message || error.message,
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
        },
    });


    const fetchTeamMembers = async () => {
        let teamId : string = team_id.toString();
        return getTeamMembersFromInvitation(teamId)
    };

    const {
        isLoading: isLoadingMembers,
        data: teamsMembersData,
        error: errorTeamsMembersData,
        refetch,
    } = useQuery(["teamsDetailsQuery"], fetchTeamMembers, {
        refetchOnWindowFocus: "always",
        refetchOnMount: "always",
        initialData: () => queryClient.getQueryData(["teamDetailsPrefetch"]),
        onSuccess: (data) => {
         // console.log("Initial Prefetch MData:", queryClient.getQueryData(["teamDetailsPrefetch"]));
        //  console.log("New fetch MData:", data);
        },
    })

    useEffect(() => {
      update({ team_code: teamsMembersData?.data?.team?.name });
    }, [teamsMembersData?.data])


    const handleSubmit = async () => {

        const validationErrors = validateNameAndEmail(name, email);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {

      notifications.show({
        id: 'load-data',
        loading: true,
        title: 'Sending Invite..',
        message: `Hold on, Sending invite to  '${name}'.`,
        autoClose: false,
        withCloseButton: true,
    });
    }

    addResourceMutation.mutate();
    }

    useEffect(() => {
      setErrors({})
    }, [name, email])

    useEffect(() => {
      setName('')
      setEmail('')
    }, [opened])
    

  return (
    <>

        <Modal opened={opened} onClose={close} title="Add Team Member" centered>
            <Box>
                <TextInput
                    required
                    label="Name"
                    placeholder="Enter name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
                        {errors.name && <Text color="red">*{errors.name}</Text>}
 <Space h="lg" />
                <TextInput
                    required
                    label="Email"
                    placeholder="Enter email id"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />
                        {errors.email && <Text color="red">*{errors.email}</Text>}

            </Box>
            <Box pt={20} >
                <RateupButtonPrimary 
                    onClick={handleSubmit}
                    title={"Send Invite"} 
                    // disabled={!isNameValid} 
                    />
            </Box>
        </Modal>

        <StyledTabs
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as TabEnum)}
        >

  <Flex
      direction={{ base: 'column', sm: 'column' }}
      gap={{ base: 'lg', sm: 'lg' }}
      justify={{ sm: 'center' }}
    >
      <Title order={1} mb="sm">{teamsMembersData?.data?.team?.name || "Team"}</Title>
      <Group>
        <Tabs.List
              style={{
                position: "absolute",
                width: "fit-content",
                left: 0,
                right: 0,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <Tabs.Tab value={TabEnum.Members}>Members</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
            </Tabs.List>
        </Group>
    </Flex>

          <Tabs.Panel value={TabEnum.Members} mt={60}>
            {/** TODO: Remove fixed height and make this responsive */}

            <SimpleGrid
                            spacing={"lg"}
                            cols={{ base: 4, sm: 1, md: 2, lg: 2 , xl: 3}}
                            
                            >
                            <Paper p="md" shadow="lg" radius="lg" style={{ cursor: "pointer" }} onClick={open}>
                                <Center h="100%">
                                    <Stack align="center">
                                    <IconPlus size={36}/>
                                    <Text size="xl" fw={700}>Invite member</Text>
                                    </Stack>
                                </Center>
                            </Paper>
                            {teamsMembersData?.data?.members?.length > 0 ? (
                                Array.isArray(teamsMembersData.data.members) ? (
                                  sort
                                    ? [...teamsMembersData?.data?.members].sort((a, b) => b.id - a.id)
                                    : [...teamsMembersData?.data?.members].sort((a, b) => a.id - b.id)
                                ).map((member, i) => (
                                  <TeamMemberCard key={i} member={member} />
                                )) : (<Group p="xl"> {teamsMembersData?.data?.members }</Group>)
                              ) : (
                                isLoadingMembers ? (
                                  <Loader />
                                ) : (
                                  <Group p="xl">
                                    {teamsMembersData?.data?.message ? (
                                      "No other members in this team!"
                                    ) : (
                                      <>
                                        Error... Try Refreshing...{" "}
                                        <RateupButtonOutline onClick={refetch} rightIcon={<IconReload size='1rem'/>} title='Refresh' size='xs' />
                                      </>
                                    )}
                                  </Group>
                                )
                              )}

            </SimpleGrid>
          </Tabs.Panel>
          
          <Tabs.Panel value={TabEnum.Settings} mt={60}>
          <TeamSettings id={team_id?.toString()} teamData={teamsMembersData?.data?.team} />
          </Tabs.Panel>

            </StyledTabs>

        <Space h="xl" />
                
    </>
  );
};

export default TeamDetails;

export  function getTeamIdByCode(teamsData, code) {
  let teamId = '';
  teamsData?.forEach(team => {
    if (team.code === code) {
      teamId = team.teamId;
    }
  });
  return teamId;
}


export async function getServerSideProps(context) {
  const { team_code } = context.query;
  let teamCode : string = team_code?.toString();
  const queryClient = new QueryClient();

  supertokensNode.init(backendConfig());
  const session = await getSessionWithRefreshHandling(context);

  const teamsData = await queryClient.prefetchQuery(["teamDataPrefetch"], 
  () => fetchTeamsByUser(session));

  let teamId = getTeamIdByCode(teamsData, teamCode)

  if(teamId){

    const teamInitialData = await queryClient.prefetchQuery(["teamDetailsPrefetch"], 
    () => getTeamMembersFromInvite(teamId, session));
  
    //console.log("Prefetched  Team data: ", JSON.stringify(teamInitialData));
    
    return {
      props: {
        dehydratedState: dehydrate(queryClient),
      },
    };
  }

  return {
    props: {},
  };
}
