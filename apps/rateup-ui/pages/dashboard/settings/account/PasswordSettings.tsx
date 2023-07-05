import React, { useState } from 'react'
import { Title, Divider, Stack, Text, Grid, PasswordInput} from '@mantine/core';
import { RateupButtonSecondary } from '../../../../components/Button/RateupButtons';
import { useForm } from "@mantine/form";
import { useChangePasswordMutation } from '../../../../backend/user/user.query';

const PasswordSettings = () => {

    const passwordValidation = (value) => {
        if (!value) {
            return 'Password is required';
        }
        if (value.length < 5) {
            return 'Password should be at least 5 characters long';
        }
        if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
            return 'Password should contain at least one letter and one number';
        }
        return null; // Validation passed
    };

    const passwordForm = useForm({
        initialValues: {
            existingPassword:"",
            newPassword: "",
            confirmPassword: "",
        },
    
        validate: {
            existingPassword: passwordValidation,
            newPassword: passwordValidation,
            confirmPassword: (value, values) => {
                if (value !== values.newPassword) {
                  return 'New Password  and Confirm Password did not match';
                }
                return null; // Validation passed
              },
          },
      });

      const [isLoading, setIsLoading] = useState(false);
      const changePassword = useChangePasswordMutation(setIsLoading); 

      const onSubmit = (values) => {
            setIsLoading(true);
            const data =  { existingPassword : values.existingPassword, newPassword : values.newPassword };
            changePassword.mutate(data);
            passwordForm.reset();
          }

  return (
    <>
        <Title> Password Settings </Title>
           <Divider my="lg" mb="xl" />

           <Stack h={300} mt="xl" pl="md">
            <Title order={2} mt="xl"> Change Password </Title>
            <Text color='dark.1'>Enter your existing password and new password to change.</Text>
            <Divider mb="lg"/>
            <form onSubmit={passwordForm.onSubmit(onSubmit)}>

            <Grid align='center'>
              <Grid.Col  md={6} lg={3}>
                <Text size={'xl'}>Current Password: </Text>
              </Grid.Col>
              <Grid.Col md={6} lg={3}>
                 <PasswordInput
                  placeholder="Enter existing password"
                  required
                  mt="md"
                  {...passwordForm.getInputProps('existingPassword')}
                />
              </Grid.Col>
           </Grid>
           <Divider my="lg"/>
           <Grid align='center'>
              <Grid.Col  md={6} lg={3}>
                <Text size={'xl'}>New Password: </Text>
              </Grid.Col>
              <Grid.Col md={6} lg={3}>
               <PasswordInput
                  placeholder="Enter new password"
                  required
                  mt="md"
                  {...passwordForm.getInputProps('newPassword')}
                />
              </Grid.Col>
           </Grid>
           <Divider my="lg"/>

           <Grid align='center'>
              <Grid.Col  md={6} lg={3}>
                <Text size={'xl'}>Confirm Password: </Text>
              </Grid.Col>
              <Grid.Col md={6} lg={3}>
                <PasswordInput
                  placeholder="Enter new password again"
                  required
                  mt="md"
                  {...passwordForm.getInputProps('confirmPassword')}
                />
              </Grid.Col>
           </Grid>
           <Divider my="lg"/>

           <Grid justify="flex-end">
              <Grid.Col   span={3}>
              <RateupButtonSecondary type="submit" loading ={isLoading} size='lg' title="Save Changes" />
              </Grid.Col>
              <Grid.Col span={5}>
              </Grid.Col>
           </Grid>

           </form>

          </Stack>

    </>
  )
}

export default PasswordSettings