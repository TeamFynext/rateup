import React, {useEffect, useState} from 'react'
import { Paper, Group, Text, Title, Grid, Divider, Modal, TextInput, Stack } from '@mantine/core';
import { RateupButtonBlue, RateupButtonPrimary, RateupButtonSecondary } from '../../Button/RateupButtons';
import { useDisclosure } from '@mantine/hooks';
import { useResetResponsesStats } from '../../../backend/surveys/response/response.query';
import { useRouter } from "next/router";
import { useUser } from '../../../context/UserContext';
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';

const OtherSettings = () => {
    const [opened, { open, close }] = useDisclosure(false);
    const { surveyId } = useRouter().query as { surveyId: string };
    const [verifyEmail, setVerifyEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const { user } = useUser();

    const resetResponsesStats = useResetResponsesStats(surveyId, close, setIsLoading);

    useEffect(() => {
        setVerifyEmail('')
      }, [opened])
    
    const confirmReset = () => {
        if(user?.email === verifyEmail){
            notifications.show({
                id: 'load-data',
                loading: true,
                title: 'Resetting data.',
                message: `Hold on, data is getting reset...`,
                autoClose: false,
                withCloseButton: false,
            });
            setIsLoading(true)
            resetResponsesStats.mutate()
        }else{
            notifications.show({
                id: "load-data",
                color:  "red",
                title:  "Error",
                message: "Incorrect email",
                icon: <IconX size="1rem" />,
                autoClose: 3000,
            });
        }
    }

  return (
    <Paper p="xl" style={{maxWidth: "400px"}}>
        
        <Grid align='center'>
                    <Grid.Col span={{ base: 6, md: 6, lg: 5 , xl: 5}} >
                        <Text size={'md'}>Reset Data : </Text>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, md: 6, lg: 5 , xl: 5}}>
                        <RateupButtonPrimary onClick={open} title="Reset Responses & Stats" />
                    </Grid.Col>
        </Grid>

        <Modal opened={opened} onClose={close}  centered>

        <Modal.Header>
            <Title order={2}>Reset Reponses & Stats</Title>
          </Modal.Header>
          <Divider />
            <Stack pt="2rem">
            <Text> Clear all the responses and stats for this survey.
            </Text>
            <Text color='red'>
                Once reset, all response data will be lost.
            </Text>

            <Stack pt="xl">
                <Text>
                    To proceed further, type in your email id and click confirm reset.
                </Text>
                <TextInput
                    style={{maxWidth:"300px"}}
                    withAsterisk
                    label="Verify email"
                    placeholder="Enter your login email"
                    required
                    mt="md"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                
                />
                
            </Stack>

            <Group mt="xl" pt="xl">

                <RateupButtonSecondary onClick={close} title="Close"/>
                <RateupButtonBlue onClick={confirmReset} title="Confirm" loading={isLoading}/>

            </Group>

            </Stack>
           
      </Modal>
        
    </Paper>
  )
}

export default OtherSettings