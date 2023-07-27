import React, { useState, useEffect } from 'react'
import { Title, Divider, Stack, Text, Grid, TextInput } from '@mantine/core';
import { useForm } from "@mantine/form";
import { RateupButtonSecondary } from '../../../components/Button/RateupButtons';
import { useEditTeamMutation } from '../../../backend/team/team.query';


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

    return (
        <>
            <Stack h={300} pl="md" sx={{ maxWidth: "800px" }}>
                <Title order={2} > Team Settings</Title>
                <Text color='dark.1'>Update team name and google reviews profile link.</Text>
                <Divider my="lg" />
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
                    <Divider my="xl" />
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
                    <Divider my="xl" />
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
                    <Divider my="xl" />
                    <Grid justify="flex-end">
                        <Grid.Col span={2}>
                            <RateupButtonSecondary type="submit" loading={isLoading} size='md' title="Save Changes" />
                        </Grid.Col>
                        <Grid.Col span={5}>
                        </Grid.Col>
                    </Grid>

                </form>

            </Stack>

        </>
    )
}

export default TeamSettings