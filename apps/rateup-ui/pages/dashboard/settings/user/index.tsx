import React from "react";
import { Tabs, Flex } from "@mantine/core";
import StyledTabs from "../../../../components/styled/StyledTabs";
import ProfileSettings from "./UserSettings";
import OrgSettings from "./OrgSettings";
import { useUser } from "../../../../context/UserContext";
import { retrieveRole } from "../../../../utils/essential";

const AccountSettings = () => {
  const { user } = useUser();
  if (retrieveRole(user.role) === "Super Admin") {
    return (
      <Flex style={{ height: "calc(100% - 65px)" }}>
        <StyledTabs defaultValue="user" w="100%">
          <Tabs.List mb="md" pb="md">
            <Tabs.Tab value="user">User</Tabs.Tab>
            <Tabs.Tab value="organization">Organization</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="user">
            <ProfileSettings />
          </Tabs.Panel>
          <Tabs.Panel value="organization">
            <OrgSettings />
          </Tabs.Panel>
        </StyledTabs>
      </Flex>
    );
  } else {
    return <ProfileSettings />;
  }
};

export default AccountSettings;
