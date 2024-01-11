import React from "react";
import { Tabs } from "@mantine/core";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import ProfileSettings from "./UserSettings";
import OrgSettings from "./OrgSettings";
import { useUser } from "../../../context/UserContext";
import { retrieveRole } from "../../../utils/essential";
import { useRouteAndCartStore } from "../../../components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { useCheckSession } from "../../../hooks/checkSession";

const AccountSettings = () => {
  const session = useCheckSession();
  const { user } = useUser();
  if (!session || !user) return;
  const cart = useRouteAndCartStore.getState().cart;

  if (retrieveRole(user?.role) === "Super Admin") {
    return (
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
    );
  } else {
    return <ProfileSettings />;
  }
};

export default AccountSettings;
