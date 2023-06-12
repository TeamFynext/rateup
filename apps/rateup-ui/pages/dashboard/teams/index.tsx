﻿import { RateupButtonOutline, RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { Flex, Title, Loader, Space, Paper, Table, Button, Text, Stack, Center, SimpleGrid} from '@mantine/core';
import { IconSquarePlus } from '@tabler/icons';
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { Box, Modal, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {  IconPlus, IconReload, IconSelector } from '@tabler/icons-react';
import { deleteTeamById } from "../../../api/team/team.api";
import { useRouter } from 'next/router'
import CardButton from "../../../components/Card";
import { useUser } from "../../../context/UserContext";
import { useForm } from "@mantine/form";
import { useCreateTeamMutation, useDeleteTeamMutation, useTeamsByUser } from "../../../api/team/team.query";
import TeamCard from "./TeamCard";

export default function Teams() {
    const sessionContext = useSessionContext();
    const [opened, { open, close }] = useDisclosure(false);
    const [sort, setSort] = useState(false)
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

    const onSubmit = (values) => {
        handleSubmit(values);
    }

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
            <>
                { isLoadingTeamsUser 
                
                ? <Loader /> 
                
                :<>
                {teamsData?.data?.length > 0 ? (
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
                                <Text size="xl" fw={700}>Add Team</Text>
                                </Stack>
                            </Center>
                            </Paper>

                            {(
                                sort
                                ? [...teamsData?.data]?.sort((a, b) => a.id - b.id).reverse()
                                : [...teamsData?.data]?.sort((a, b) => a.id - b.id)
                            ).map((team) => (
                            <TeamCard key={team.teamId} team={team} reftchTeams={reftchTeams} />
                            ))}
                        </SimpleGrid>

                ) : (
                    <>  {teamsData?.message  ?  teamsData?.message
                        :
                        <> Error... Try Refreshing... <RateupButtonOutline onClick={reftchTeams} rightIcon={<IconReload size='1rem'/>} title='Refresh' size='xs'/></>          
                        }          
                        </>
                )}

                </>}
            </>

                }

        </>
    );
}