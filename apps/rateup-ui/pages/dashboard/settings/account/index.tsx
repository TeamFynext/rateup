import React from 'react'
import { Tabs } from '@mantine/core';
import  StyledTabs  from './StyledTabs';
import PasswordSettings from './PasswordSettings';
import ProfileSettings from './ProfileSettings';
import OrgSettings  from './OrgSettings';

const AccountSettings = () => {
  return (
    <>
       <StyledTabs defaultValue="settings" >
        
        <Tabs.List mb="md" pb="md">
            <Tabs.Tab value="settings" >
              Account
            </Tabs.Tab>
            <Tabs.Tab value="general">
              General
            </Tabs.Tab>
            <Tabs.Tab value="organization">
              Organization
            </Tabs.Tab>
          </Tabs.List>

            <Tabs.Panel value="settings" >
              <ProfileSettings />
            </Tabs.Panel>

            <Tabs.Panel value="general">
              <PasswordSettings />
            </Tabs.Panel>

            <Tabs.Panel value="organization">
              <OrgSettings />
            </Tabs.Panel>

       </StyledTabs> 
    </>
  )
}

export default AccountSettings