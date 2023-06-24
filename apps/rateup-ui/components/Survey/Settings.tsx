import React, {useEffect, useState } from 'react';
import { Stack, Paper, Group, Title, Switch, TextInput } from '@mantine/core';
import { RateupButtonSecondary } from '../Button/RateupButtons';
import { useUpdateSurveyPwdMutation } from '../../backend/surveys/surveys.query';
import { IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export const SurveySettings = ({surveyId, isProtected}) => {
  const [passwordProtect, setPasswordProtect] = useState(isProtected);
  const [password, setPassword] = useState('')

  useEffect(() => {
    console.log("Test...."+JSON.stringify(isProtected))
  }, [isProtected])
  

  function updatePassword() {
    updateSurveyPassword.mutate()
  }

  function handleSwitch(event : any){
    setPasswordProtect(event.currentTarget.checked)
    if(event.currentTarget.checked){
        notifications.show({
            id: 'load-data',
            color: 'info',
            title: 'Set Password',
            message: 'Enter Password and Save to complete the process.',
            icon: <IconInfoCircle size="1rem" />,
            autoClose: 5000,
          });
    }else{
        setPassword('')
        updateSurveyPassword.mutate()
    }
  }
  

  const updateSurveyPassword = useUpdateSurveyPwdMutation(surveyId, passwordProtect, password);


  return (
      <Paper p="xl"  sx={{minHeight:'600px'}}>
        <Title order={2} pb={30}>Survey Settings</Title>
         
            <Switch.Group 
                px={30}
                py={20}
                pt={30}
                label="Password Protection"
                description="Add password to the survey."
                withAsterisk
                >
                     <Group mt="xs">
                    </Group>

                </Switch.Group>

                <Switch 
                    px={30}
                    py={20}
                    checked={passwordProtect} 
                    onChange={(event) => handleSwitch(event)} 
                    label="Enable"
                    />

            {passwordProtect && (
                <Stack px={30} py={20} sx={{maxWidth:'400px'}}>
                    <TextInput
                        label="Password"
                        type="text"
                        placeholder="Enter new password"
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="off"
                    />

                    <RateupButtonSecondary
                        title={"Save Password"}                 
                        size="md"
                        onClick={updatePassword}

                    />

                </Stack>
            )}

      </Paper>
  );
};
