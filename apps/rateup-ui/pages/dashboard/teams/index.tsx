import ButtonComponent from "../../../components/Button/ButtonComponent";
import { Flex, Title, Space, Paper, Table, Button, SimpleGrid} from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { Box, Modal, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useMutation } from "@tanstack/react-query";
import { IconCheck, IconSelector } from '@tabler/icons-react';
import { getOrgIdRole, getUserID } from "../../../utils/userInfo"
import { createTeam, deleteTeamById, getTeamsByOrg, getTeamsByUser } from "../../../api/team/team.api";
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import CardButton from "../../../components/Card";
import { useUser } from "../../../context/UserContext";

export default function Teams() {
    const sessionContext = useSessionContext();
    const [opened, { open, close }] = useDisclosure(false);
    const [sort, setSort] = useState(false)
    const [name, setName] = useState('');
    const [deleteTeamId, setDeleteTeamId] = useState<string>();
    const isNameValid = name.length >= 2;
    const queryClient = useQueryClient()
    const router = useRouter()
    const { user, setUser } = useUser();

    useEffect(() => {
        setName('')
    }, [opened])

    const fetchTeams = async () => {
        const { orgId } = await getOrgIdRole()
        return getTeamsByOrg(orgId)
    };

     const {
        isLoading: isLoadingTeamsUser,
        data: teamsDataUser,
        error: errorTeamsDataUser,
        refetch: reftchTeams,
    } = useQuery(["teamsDataUserQuery"], getTeamsByUser, {
        refetchOnWindowFocus: "always",
        refetchOnMount: "always",
    })

    let teamsData = teamsDataUser?.data

    useEffect(() => {
        console.log(teamsDataUser?.data?.data);
    }, [teamsDataUser]);

    useEffect(() => {
        deleteTeamId && deleteTeamMutation.mutate();
        if (deleteTeamId) {
            notifications.show({
                id: 'load-data',
                loading: true,
                title: 'Deleting Team..',
                message: `Hold on, Your team is getting deleted.`,
                autoClose: false,
                withCloseButton: false,
            });

        }
    }, [deleteTeamId]);

    const handleCreateTeam = async () => {
        const { orgId } = await getOrgIdRole()
        const { userId } = await getUserID()
        const data = { name, orgId, userId }
        return createTeam(data)
    };


    const handleDeleteTeam = async () => {
        return deleteTeamById(deleteTeamId)
    };

    const deleteTeamMutation = useMutation(() => handleDeleteTeam(), {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamsDataQuery'] }),  //update team list on delete
                notifications.update({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    message: 'Team deleted successfully.',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                });
            close()
            setDeleteTeamId('')
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
        },

    })

    const addResourceMutation = useMutation(() => handleCreateTeam(), {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamsDataQuery'] }),  //update team list on add
                notifications.update({
                    id: 'load-data',
                    color: 'teal',
                    title: 'Success',
                    message: 'Team created successfully.',
                    icon: <IconCheck size="1rem" />,
                    autoClose: 3000,
                });
            close()
            reftchTeams()
        },

        onError: (error: Error) => {
            console.error("Error creating the post:", error.message);
            notifications.update({
                id: 'load-data',
                color: 'red',
                title: 'Failed',
                message: error.message,
                icon: <IconCheck size="1rem" />,
                autoClose: 3000,
            });
        },
    });

    const handleSubmit = async () => {
        notifications.show({
            id: 'load-data',
            loading: true,
            title: 'Creating Team..',
            message: `Hold on, Your team '${name}' is getting created.`,
            autoClose: false,
            withCloseButton: false,
        });
        addResourceMutation.mutate();
    }

    if (sessionContext.loading === true) {
        return null;
    }

    function viewTeam(id) {
        router.push(`/dashboard/teams/${id}`)
    }
    
    return (
        <><Modal opened={opened} onClose={close} title="Create Team" centered>
            <Box>
                <TextInput
                    required
                    label="Name"
                    placeholder="Enter team name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
            </Box>
            <Box pt={20} >
                <ButtonComponent onClick={handleSubmit}
                    title={"Create"} disabled={!isNameValid} />
            </Box>
        </Modal>


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
                    <Title order={1}>Teams</Title>
                    {
                        user?.role === 'ADMIN' 
                        ? <p>You can view all your teams.</p>
                        :  <p >You can view all the teams under your organization. Also create new teams from here.</p>
                    }
                </Flex>

                <Flex
                    mih={50}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                >
                    {
            user?.role !== 'ADMIN' 
            &&      <ButtonComponent
                        onClick={open}
                        title={"Create Team"}
                        rightIcon={<IconSquarePlus
                            size="1rem" />} />

        }
                    

                    <ButtonComponent
                        onClick={ () =>  setSort(!sort)}
                        title={"Sort"}
                        variant="subtle"
                        rightIcon={<IconSelector
                            size="1rem" />}
                    />
                </Flex>
            </Flex>

            <Space h="xl" />

        {
            user?.role === 'ADMIN' 
           ?
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
        {
            teamsDataUser?.data?.data
            ?
            teamsDataUser?.data?.data?.map((team, i : number) => (<CardButton key={i} title={team?.teamName}></CardButton>))
            : "No teams found."
        }

      </SimpleGrid>
             //TODO optimize
           : //For Super Admin
            <Paper shadow="xs" radius="md" p="xl">
                { isLoadingTeamsUser 
                
                ? "Loading Data..."
                
                :<>
                {teamsData && teamsData.data && teamsData.data.length > 0 ? (
                    <Table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                                sort
                                ? [...teamsData?.data]?.sort((a, b) => a.id - b.id).reverse()
                                : [...teamsData?.data]?.sort((a, b) => a.id - b.id)
                            ).map(({ teamId, teamName }) => (
                                <tr key={teamId}>
                                    <td>{teamName} </td>
                                    <td>{teamId}</td>
                                    <td>
                                        <Button color="blue" onClick={() => viewTeam(teamId)}>
                                             View
                                        </Button>
                                    </td>
                                    <td>
                                        <Button color="red" onClick={() => setDeleteTeamId(teamId)}>
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                ) : (
                    <p>No teams found. Try creating one.</p>
                )}

                </>}
            </Paper>

                }

        </>
    );
}