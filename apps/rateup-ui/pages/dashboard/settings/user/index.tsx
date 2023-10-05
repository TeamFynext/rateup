import React from "react";
import { Tabs, Flex } from "@mantine/core";
import StyledTabs from "../../../../components/styled/StyledTabs";
import PasswordSettings from "./PasswordSettings";
import ProfileSettings from "./UserSettings";
import OrgSettings from "./OrgSettings";

const AccountSettings = () => {
  return (
    <Flex style={{ flex: 1 }}>
      <StyledTabs defaultValue="user" w="100%">
        <Tabs.List mb="md" pb="md">
          <Tabs.Tab value="user">User</Tabs.Tab>
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="organization">Organization</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="user">
          <ProfileSettings />
        </Tabs.Panel>

        <Tabs.Panel value="general">
          <PasswordSettings />
        </Tabs.Panel>

        <Tabs.Panel value="organization">
          <OrgSettings />
        </Tabs.Panel>
      </StyledTabs>
    </Flex>
  );
};

export default AccountSettings;
