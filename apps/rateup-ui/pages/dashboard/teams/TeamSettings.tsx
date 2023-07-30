import React, { useState, useEffect } from 'react'
import { Title, Dialog, Stack, Text, Grid, Group, TextInput,Paper, Space } from '@mantine/core';
import { useForm } from "@mantine/form";
import { RateupButtonPrimary, RateupButtonSecondary } from '../../../components/Button/RateupButtons';
import { useDeleteTeamMutation, useEditTeamMutation } from '../../../backend/team/team.query';
import { useDisclosure } from '@mantine/hooks';
import { deleteTeamById } from '../../../backend/team/team.api';
import { notifications } from '@mantine/notifications';


export interface ITeamData {
    name: string;
    googleLink: string;
    code: string;
    id: string
}

const TeamSettings = ({ id, teamData }: { id: string, teamData: ITeamData }) => {

    const teamForm = useForm({
        initialValues: {
            name: "",
            code: "",
            googleLink: "",
        },
        validate: {
            name: (value) => {
                if (value.length < 4) {
                    return 'Name should be min 4 characters';
                }
                return null; // Validation passed
            },
            code: (value) => {
                if (value.length < 2) {
                    return 'Code should be min 3 characters';
                }
                return null; // Validation passed
            },
            googleLink: (value) => {
                if (value.length < 12) {
                    return 'Enter valid Google Url: https://....';

                    //TODO  - add detailed url validation supporting shortened url
                }
                return null; // Validation passed
            },
        },
    });

    useEffect(() => {
        if (teamData?.name) {
            teamForm.setValues({
                name: teamData?.name || "",
                code: teamData?.code || "",
                googleLink: teamData?.googleLink || "",
            });
        }
    }, [teamData]);

    const [isLoading, setIsLoading] = useState(false);
    const editTeam = useEditTeamMutation(id, setIsLoading);
    const onSubmit = (values) => {
        setIsLoading(true);
        const data = { name: values.name, code: values.code, googleLink: values.googleLink };
        editTeam.mutate(data);
    }

    const [opened, { toggle, close }] = useDisclosure(false);

    const [deleteTeamId, setDeleteTeamId] = useState<string>();
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

    const handleDeleteTeam = async () => {
        return deleteTeamById(deleteTeamId)
    };

    const deleteTeamMutation = useDeleteTeamMutation(handleDeleteTeam);


    return (
        <>
            <Stack h={300} pl="md" sx={{ maxWidth: "600px" }}>
                <Title order={2} pb="lg"> Team Settings</Title>

                <Paper radius="md" px="md" py="xl" shadow='lg'>
                    <Group py="md">
                        <Title order={4} > Delete Team:</Title>
                        <Space/>
                        <RateupButtonPrimary onClick={toggle}
                        loading={isLoading} size='sm' title="Delete" />
                    </Group>
                </Paper>

                <Dialog opened={opened} withCloseButton onClose={close} size="lg" radius="md">
                    <Text size="md" mb="xs" weight={500}>
                        Are you sure to delete this team?
                    </Text>

                    <Group align="center" pt="lg">
                    <RateupButtonSecondary onClick={close} loading={isLoading} size='md' title="Cancel" />

                    <RateupButtonPrimary 
                    
                    onClick={() => {
                        close()
                        setDeleteTeamId(teamData?.id)
                    }} 
                    
                    loading={isLoading} size='md' title="Yes, Delete" />

                    </Group>
                </Dialog>



                <Paper radius="md" p="md" shadow='lg'>
                <Title order={4} pb="xl"> Edit Team:</Title>

                <form onSubmit={teamForm.onSubmit(onSubmit)}>

                    <Grid align='center'>
                        <Grid.Col md={6} lg={4}>
                            <Text size={'md'}>Team Name: </Text>
                        </Grid.Col>
                        <Grid.Col md={6} lg={4}>
                            <TextInput
                                placeholder="Enter team name"
                                required
                                mt="md"
                                {...teamForm.getInputProps('name')}
                            />
                        </Grid.Col>
                    </Grid>
                    <Grid align='center'>
                        <Grid.Col md={6} lg={4}>
                            <Text size={'md'}>Team Code: </Text>
                        </Grid.Col>
                        <Grid.Col md={6} lg={4}>
                            <TextInput
                                placeholder="Enter team code"
                                required
                                mt="md"
                                {...teamForm.getInputProps('code')}
                            />
                        </Grid.Col>
                    </Grid>
                    <Grid align='center'>
                        <Grid.Col md={6} lg={4}>
                            <Text size={'md'}>Google Reviews Link: </Text>
                        </Grid.Col>
                        <Grid.Col md={6} lg={4}>
                            <TextInput
                                placeholder="Enter google url"
                                required
                                mt="md"
                                {...teamForm.getInputProps('googleLink')}
                            />
                        </Grid.Col>
                    </Grid>
                    <Grid justify="flex-end" pt="xl">
                        <Grid.Col span={2}>
                            <RateupButtonSecondary type="submit" loading={isLoading} size='md' title="Save Changes" />
                        </Grid.Col>
                        <Grid.Col span={5}>
                        </Grid.Col>
                    </Grid>

                </form>
                </Paper>

            </Stack>

        </>
    )
}

export default TeamSettings