﻿import { RateupButtonOutline, RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { Flex, Title, Loader, Space, Paper, Table, Button, SimpleGrid} from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { Box, Modal, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {  IconReload, IconSelector } from '@tabler/icons-react';
import { deleteTeamById } from "../../../api/team/team.api";
import { useRouter } from 'next/router'
import CardButton from "../../../components/Card";
import { useUser } from "../../../context/UserContext";
import { useForm } from "@mantine/form";
import { useCreateTeamMutation, useDeleteTeamMutation, useTeamsByUser } from "../../../api/team/team.query";

export default function Teams() {
    const sessionContext = useSessionContext();
    const [opened, { open, close }] = useDisclosure(false);
    const [sort, setSort] = useState(false)
    const [deleteTeamId, setDeleteTeamId] = useState<string>();
    const router = useRouter()
    const { user, setUser } = useUser();

    const createTeamForm = useForm({
        initialValues: {
            name: "",
            code: "",
        },
    
        validate: {
            name: (value) => {
                if (value.length < 3) {
                  return 'Team Name should be at least 3 characters long';
                }
                return null; // Validation passed
              },
              code: (value) => {
                if (value.length < 2) {
                  return 'Team Code should be at least 2 characters long';
                }
                return null; // Validation passed
              },
          },
      });

    const {
        isLoading: isLoadingTeamsUser,
        data: teamsDataUser,
        error: errorTeamsDataUser,
        refetch: reftchTeams,
      } = useTeamsByUser();

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

    const onSubmit = (values) => {
        handleSubmit(values);
    }

    const handleDeleteTeam = async () => {
        return deleteTeamById(deleteTeamId)
    };

    const deleteTeamMutation = useDeleteTeamMutation(handleDeleteTeam, setDeleteTeamId, close, reftchTeams);
    const createTeamMutation = useCreateTeamMutation(close, createTeamForm);


    const handleSubmit = async (values) => {
        notifications.show({
            id: 'load-data',
            loading: true,
            title: 'Creating Team..',
            message: `Hold on, Your team '${name}' is getting created.`,
            autoClose: false,
            withCloseButton: false,
        });
        createTeamMutation.mutate(values);
    }

    if (sessionContext.loading === true) {
        return null;
    }

    function viewTeam(id) {
        router.push(`/dashboard/teams/${id}`)
    }
    
    return (
        <>
        <Modal opened={opened} onClose={close} title="Create Team" centered>
            <form onSubmit={createTeamForm.onSubmit(onSubmit) }>
            <Box>
                <TextInput
                    withAsterisk
                    label="Name"
                    placeholder="Enter team name"
                    {...createTeamForm.getInputProps('name')}
                />
                <TextInput
                    withAsterisk
                    label="Code"
                    placeholder="Enter team code"
                    {...createTeamForm.getInputProps('code')}
                />
            </Box>
            <Box pt={20} >
                <RateupButtonPrimary type="submit"
                    title={"Create"} />
            </Box>
            </form>
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
            &&      <RateupButtonPrimary
                        onClick={open}
                        title={"Create Team"}
                        rightIcon={<IconSquarePlus
                            size="1rem" />} />

        }
                    

                    <RateupButtonPrimary
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
                
                ? <Loader /> 
                
                :<>
                {teamsData?.data?.length > 0 ? (
                    <Table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(
                                sort
                                ? [...teamsData?.data]?.sort((a, b) => a.id - b.id).reverse()
                                : [...teamsData?.data]?.sort((a, b) => a.id - b.id)
                            ).map(({ teamId, teamName, code }) => (
                                <tr key={teamId}>
                                    <td>{teamName} </td>
                                    <td>{code}</td>
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
                    <>  {teamsData?.message  ?  teamsData?.message
                        :
                        <> Error... Try Refreshing... <RateupButtonOutline onClick={reftchTeams} rightIcon={<IconReload size='1rem'/>} title='Refresh' size='xs'/></>          
                        }          
                        </>
                )}

                </>}
            </Paper>

                }

        </>
    );
}