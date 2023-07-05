import React from 'react'
import { Tabs } from '@mantine/core';
import  StyledTabs  from './StyledTabs';
import PasswordSettings from './PasswordSettings';
import ProfileSettings from './ProfileSettings';

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
              <ProfileSettings />
            </Tabs.Panel>

            <Tabs.Panel value="general">
              <PasswordSettings />
            </Tabs.Panel>

       </StyledTabs> 
    </>
  )
}

export default AccountSettings