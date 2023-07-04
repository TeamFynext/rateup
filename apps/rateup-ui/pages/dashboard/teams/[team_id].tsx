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
import { getTeamMembersFromInvitation, inviteTeamMember, getTeamSurveys } from '../../../backend/team/team.api';
import StyledTabs from '../surveys/StyledTabs';
import TeamMemberCard from './TeamMemberCard';
import { IconPlus } from '@tabler/icons-react';
import { backendConfig } from '../../../config/backendConfig';
import { getSessionWithRefreshHandling } from '../../../utils/auth/getSessionWithRefreshHandling';
import supertokensNode from 'supertokens-node'
import { fetchTeamSurveys, getTeamMembersFromInvite } from '../../../backend/ssr/team.api';
import { SurveyCard } from '../surveys';
import { useRouteParams } from '../../../context/RouteParamsContext';


const TeamDetails = () => {
  // Get the team ID from the router
  const router = useRouter();
  const { team_id  } = router.query;
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sort, setSort] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient()
  const { state, update } = useRouteParams();

  enum TabEnum {
    Members = "Members",
    Survey = "Survey",
    Settings = "Settings",
  }
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Members);

  const handleMemberInvite = async () => {
        const { orgId } = await getOrgIdRole()
        const { userId } = await getUserID()
        let teamId : string = team_id.toString();
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
          console.log("Initial Prefetch MData:", queryClient.getQueryData(["teamDetailsPrefetch"]));
  
          console.log("New fetch MData:", data);
  
        },
    })

    useEffect(() => {
      update({ team_id: teamsMembersData?.data?.team?.name });
    }, [teamsMembersData?.data])

    const {
      isLoading: isLoadingSurveys,
      data: surveys,
      error: errorTeamsSurveysData,
      refetch: refetchSurveys,
  } = useQuery(["teamSurveysQuery"], () => getTeamSurveys(team_id.toString()), {
      refetchOnWindowFocus: "always",
      refetchOnMount: "always",
      initialData: () => queryClient.getQueryData(["teamSurveysPrefetch"]),
      onSuccess: (data) => {
        console.log("Initial Prefetch SData:", queryClient.getQueryData(["teamSurveysPrefetch"]));

        console.log("New fetch SData:", surveys);

      },
  })

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
          onTabChange={(tab) => setActiveTab(tab as TabEnum)}
        >

        <Flex
            mih={50}
            gap="md"
            justify="flex-start"
            align="center"
            direction="row"
            wrap="wrap"
            >
            <Title order={1} mb="sm">{teamsMembersData?.data?.team?.name || "Team"}</Title>
            <Tabs.List
              sx={{
                position: "absolute",
                width: "fit-content",
                left: 0,
                right: 0,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <Tabs.Tab value={TabEnum.Members}>Members</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Survey}>Survey</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
            </Tabs.List>
            </Flex>

          <Tabs.Panel value={TabEnum.Members} mt={60}>
            {/** TODO: Remove fixed height and make this responsive */}

            <SimpleGrid
                            cols={4}
                            spacing={"lg"}
                            breakpoints={[
                            { minWidth: "xl", cols: 3 },
                            { minWidth: "lg", cols: 2 },
                            { minWidth: "md", cols: 2 },
                            { maxWidth: "md", cols: 1 },
                            ]}
                            >
                            <Paper p="md" shadow="lg" radius="lg" sx={{ cursor: "pointer" }} onClick={open}>
                                <Center h="100%">
                                    <Stack align="center">
                                    <IconPlus size={36}/>
                                    <Text size="xl" fw={700}>Invite member</Text>
                                    </Stack>
                                </Center>
                            </Paper>
            {teamsMembersData?.data?.members?.length > 0 ? (


            (
                                sort
                                ? [...teamsMembersData?.data?.members]?.sort((a, b) => a.id - b.id).reverse()
                                : [...teamsMembersData?.data?.members]?.sort((a, b) => a.id - b.id)
                                  ).map((member, i) => (
                                    <TeamMemberCard key={i} member={member} />

                                  ))

                )

: (
    isLoadingMembers ? <Loader /> 

    : <Group p="xl">  {teamsMembersData?.data?.members?.length === 0  ? "No other members in this team!"
        :
        <> Error... Try Refreshing... <RateupButtonOutline onClick={refetch} rightIcon={<IconReload size='1rem'/>} title='Refresh' size='xs'/></>
        
        } 
        
        </Group>
)}

</SimpleGrid>
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Survey} mt={60}>
          <SimpleGrid
              cols={4}
              spacing={"lg"}
              breakpoints={[
                { minWidth: "xl", cols: 3 },
                { minWidth: "lg", cols: 2 },
                { minWidth: "md", cols: 2 },
                { maxWidth: "md", cols: 1 },
              ]}
            >
              {/* <Paper p="md" shadow="lg" radius="lg" sx={{ cursor: "pointer" }} onClick={open}>
                <Center h="100%">
                  <Stack align="center">
                    <IconPlus size={36}/>
                    <Text size="xl" fw={700}>Add Survey</Text>
                  </Stack>
                </Center>
              </Paper> */}

              {surveys?.data?.map((s) => (
                <SurveyCard key={s.id} survey={s} />
              ))}
          </SimpleGrid>

          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Settings} mt={60}>
            Team Settings
          </Tabs.Panel>

            </StyledTabs>

        <Space h="xl" />

                    
    </>
  );
};

export default TeamDetails;


export async function getServerSideProps(context) {
  const { team_id } = context.query;
  let teamId : string = team_id.toString();
  const queryClient = new QueryClient();

  supertokensNode.init(backendConfig());
  const session = await getSessionWithRefreshHandling(context);
  const teamInitialData = await queryClient.prefetchQuery(["teamDetailsPrefetch"], 
  () => getTeamMembersFromInvite(teamId, session));

  const teamInitialSurveys = await queryClient.prefetchQuery(["teamSurveysPrefetch"], 
  () => fetchTeamSurveys(teamId, session));

  console.log("Prefetched  Team data: ", JSON.stringify(teamInitialData));
  console.log("Prefetched  Team Survey data: ", JSON.stringify(teamInitialSurveys));

  console.log("Team Id: ", teamId);

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
