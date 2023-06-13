import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Tabs, Paper, Loader, Stack, Title, Modal, SimpleGrid, Box, TextInput, Space, Text, Center, Button, Group, Flex } from '@mantine/core';
import { RateupButtonOutline, RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { IconSquarePlus, IconSelector, IconCheck, IconTrashXFilled, IconReload } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import validateNameAndEmail from "./validation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from '@tanstack/react-query'
import { getOrgIdRole, getUserID } from '../../../utils/userInfo';
import { getTeamMembersFromInvitation, inviteTeamMember } from '../../../api/team/team.api';
import StyledTabs from '../surveys/StyledTabs';
import TeamMemberCard from './TeamMemberCard';
import { IconPlus } from '@tabler/icons-react';


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
            queryClient.invalidateQueries({ queryKey: ['teamsDataQuery'] }),  //update team list on add
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
    } = useQuery(["teamsDataQuery"], fetchTeamMembers, {
        refetchOnWindowFocus: "always",
        refetchOnMount: "always",
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
                    placeholder="Enter team name"
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
            {teamsMembersData?.data?.members?.length > 0 ? (
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

            {(
                                sort
                                ? [...teamsMembersData?.data?.members]?.sort((a, b) => a.id - b.id).reverse()
                                : [...teamsMembersData?.data?.members]?.sort((a, b) => a.id - b.id)
                                  ).map((member) => (
                                    <TeamMemberCard member={member} />

                                  ))}

                </SimpleGrid>)

: (
    isLoadingMembers ? <Loader /> 

    : <>  {teamsMembersData?.data?.members.length === 0  ? "No members in this team!"
        :
        <> Error... Try Refreshing... <RateupButtonOutline onClick={refetch} rightIcon={<IconReload size='1rem'/>} title='Refresh' size='xs'/></>
        
        } 
        
        </>
)}
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Survey}>
          Survey Section
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Settings}>
            Team Settings
          </Tabs.Panel>

            </StyledTabs>

        <Space h="xl" />

                    
    </>
  );
};

export default TeamDetails;
