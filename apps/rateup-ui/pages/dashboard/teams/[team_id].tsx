import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Tabs, Paper, Loader, Flex, Title, Modal, Badge, Box, TextInput, Space, Text, Table, Button } from '@mantine/core';
import ButtonComponent, { OutlineButton } from "../../../components/Button/ButtonComponent";
import { IconSquarePlus, IconSelector, IconCheck, IconX, IconTrashXFilled, IconReload } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import validateNameAndEmail from "./validation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from '@tanstack/react-query'
import { getOrgIdRole, getUserID } from '../../../utils/userInfo';
import { deleteInviteById, getTeamMembersFromInvitation, inviteTeamMember } from '../../../api/team/team.api';


const TeamDetails = () => {
  // Get the team ID from the router
  const router = useRouter();
  const { team_id  } = router.query;
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sort, setSort] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteInviteId, setDeleteInviteId] = useState('')

  const queryClient = useQueryClient()


  useEffect(() => {
    deleteInviteId && deleteInviteMutation.mutate();
    if (deleteInviteId) {
        notifications.show({
            id: 'load-data',
            loading: true,
            title: 'Deleting Invite..',
            message: `Hold on, Member invite is getting deleted.`,
            autoClose: false,
            withCloseButton: false,
        });

    }
}, [deleteInviteId]);


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

    const handleDeleteInvite = async () => {
        return deleteInviteById(deleteInviteId)
    };

    const deleteInviteMutation = useMutation(() => handleDeleteInvite(), {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamsDataQuery'] }),  //update team list on delete
                notifications.update({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    message: 'Invite deleted successfully.',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                });
            close()
            refetch()
            setDeleteInviteId('')
        },

        onError: (error: Error) => {
            console.error("Error :", error.message);
            notifications.update({
                id: 'load-data',
                color: 'red',
                title: 'Failed',
                message: error.message,
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
            setDeleteInviteId('')

        },

    })

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
    <Paper shadow="xs" radius="md" p="xl">
        <Title order={1}>Team Management</Title>
        <Space h="xl" />
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
                <ButtonComponent 
                    onClick={handleSubmit}
                    title={"Send Invite"} 
                    // disabled={!isNameValid} 
                    />
            </Box>
        </Modal>
                    
      <Tabs color="teal" defaultValue="first">
      <Tabs.List>
        <Tabs.Tab value="first" color="blue">
          Members
        </Tabs.Tab>
                <Tabs.Tab value="second">Profile</Tabs.Tab>

        <Tabs.Tab value="third" color="blue">
          Settings
        </Tabs.Tab>
      </Tabs.List>
                  <Space h="xl" />

      <Tabs.Panel value="first" pt="xs">
        <Flex
                mih={50}
                gap="md"
                justify="space-between"
                align="center"
                direction="row"
                wrap="wrap"
            >
                <Flex
                    mih={50}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="column"
                    wrap="wrap"
                >
                    <Title order={2} color="blue.9">Members</Title>
                    <p >You can view all the members under your team. Also create new team members from here.</p>
                </Flex>

                <Flex
                    mih={50}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                >

                    <ButtonComponent
                        onClick={open}
                        title={"Add Member"}
                        rightIcon={<IconSquarePlus
                            size="1rem" />} />

                    <ButtonComponent
                        onClick={ () =>  setSort(!sort)}
                        title={"Sort"}
                        variant="subtle"
                        rightIcon={<IconSelector
                            size="1rem" />}
                    />
                </Flex>
            </Flex>
                        <Paper shadow="xs" radius="md" p="xl">
                {teamsMembersData?.data?.length > 0 ? (
                    <Table>
                        <thead>
                            <tr>
                                      <th>Name</th>
                                <th>Email</th>
                                      <th>Invite Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                                sort
                                ? [...teamsMembersData?.data]?.sort((a, b) => a.id - b.id).reverse()
                                : [...teamsMembersData?.data]?.sort((a, b) => a.id - b.id)
                                  ).map(({ id, name, email, status }) => (
                                      <tr key={email}>
                                          <td>{name || 'N/A'}</td>
                                          <td>{email || 'N/A'}</td>
                                          <td style={{ minHeight: '40px'}}>

                                              <Badge color={status === 'PENDING' ? "yellow" : "teal"} variant="filled">{status || 'N/A'} </Badge>
                                          </td>

                                    <td>
                                    {status === 'PENDING' &&
                                        <Button color="red" size="xs" onClick={() => setDeleteInviteId(id)}>
                                                  <IconTrashXFilled />
                                        </Button>

                                  }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                ) : (
                    isLoadingMembers ? <Loader /> 
               
                    : <>  {teamsMembersData?.data?.message  ?  teamsMembersData?.data?.message 
                        :
                        <> Error... Try Refreshing... <OutlineButton onClick={refetch} rightIcon={<IconReload size='1rem'/>} title='Refresh' size='xs'/></>
                        
                        } 
                        
                        </>
                )}
            </Paper>
      </Tabs.Panel>

      <Tabs.Panel value="second" pt="xs">
        Id : {team_id}
      </Tabs.Panel>

      <Tabs.Panel value="third" pt="xs">
        Team settings
      </Tabs.Panel>
    </Tabs>
    </Paper>
  );
};

export default TeamDetails;
