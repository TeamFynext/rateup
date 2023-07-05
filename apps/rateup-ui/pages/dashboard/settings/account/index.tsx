import React from 'react'
import { Tabs, Title, Divider, Stack, Text, Grid, Select, Avatar, Group, TextInput} from '@mantine/core';
import  StyledTabs  from './StyledTabs';
import { RateupButtonSecondary } from '../../../../components/Button/RateupButtons';
import PasswordSettings from './PasswordSettings';

const AccountSettings = () => {
  return (
    <>
       <StyledTabs defaultValue="settings" >
        <Tabs.List mb="xl" pb="lg">
          <Tabs.Tab value="settings" >
            Account
          </Tabs.Tab>
          <Tabs.Tab value="general">
            General
          </Tabs.Tab>
        </Tabs.List>

         <Tabs.Panel value="settings" >
            <Title> Profile Settings </Title>
            <Divider my="lg" mt="lg" />
            <Stack pl="lg">

            <Grid align='center'>
              <Grid.Col md={6} lg={3}>
              <Avatar src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/sample.png`} alt={"Profile Picture"} radius="xl" size={200} />

              </Grid.Col>
              <Grid.Col md={6} lg={4} >
                <Stack> 
                  <Text size="xxl" fw={500}> Catherine George </Text>
                  <Text> Manager (Role)</Text>

                  <Stack mt="md" >
                    <Text fw={500}> sss@gmail.com </Text>
                  </Stack>
                </Stack>
              </Grid.Col>
              <Grid.Col md={6} lg={3} >
                <Stack justify='center'>
                  <RateupButtonSecondary title='Change Image'  size='lg'/>
                  <RateupButtonSecondary title='Remove Image' size='lg' />
                </Stack>
              </Grid.Col>
            </Grid>


            <Group mt="xl">
               <Text size="xl" color='dark.1'> Personal Info</Text>
            </Group>
            <Divider mb="lg"/>
            <Grid>
              <Grid.Col  md={6} lg={2}>
              <Select
                label="Title"
                placeholder="Select"
                data={[
                  { value: 'male', label: 'Mr' },
                  { value: 'female', label: 'Mrs' },
                ]}
              />
              </Grid.Col>
              <Grid.Col  md={6} lg={4}>
                <TextInput
                  
                  label="First name"
                  placeholder="Enter your first name"
                />
              </Grid.Col>
              <Grid.Col  md={6} lg={3}>              
              <TextInput
                
                label="Last name"
                placeholder="Enter your last name"
              /></Grid.Col>
            </Grid>


            <Grid>
            <Grid.Col md={6} lg={5}>              
              <TextInput
              disabled
                withAsterisk
                label="Email"
                placeholder="Enter your email"
              /></Grid.Col>
              <Grid.Col md={6} lg={4}>
                <TextInput
                  
                  label="Phone"
                  placeholder="Enter your phone number"
                />
              </Grid.Col>

            </Grid>

            <Grid justify="flex-end">
            <Grid.Col span={5}>
              </Grid.Col>
              <Grid.Col   span={5}>
              <RateupButtonSecondary size='lg' title="Save Changes" />
              </Grid.Col>

           </Grid>


            </Stack>


          </Tabs.Panel>

          <Tabs.Panel value="general">
                <PasswordSettings />
          </Tabs.Panel>
    </StyledTabs> 
    </>
  )
}

export default AccountSettings