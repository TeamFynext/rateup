import React, { useEffect, useState } from "react";
import { Tabs } from "@mantine/core";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import ProfileSettings from "./UserSettings";
import OrgSettings from "./OrgSettings";
import { useUser } from "../../../context/UserContext";
import { retrieveRole } from "../../../utils/essential";
import AccountSettings from "./AccountSettings";
import { useRouteAndCartStore } from "../../../components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { useCheckSession } from "../../../hooks/checkSession";
import { useRouter } from "next/router";
import AdvancedSettings from "./AdvancedSettings";

const Settings = () => {
  const router = useRouter();
  const session = useCheckSession();
  const { user } = useUser();
  if (!session || !user) return;
  const cart = useRouteAndCartStore.getState().cart;

  if (retrieveRole(user?.role) === "Super Admin") {
    return (
      <StyledTabs
        value={(router.query?.activeTab as string) || "user"}
        onChange={(value) => router.push(`?activeTab=${value}`)}
        w="100%"
      >
        <Tabs.List mb="md" pb="md">
          <Tabs.Tab value="user">User</Tabs.Tab>
          <Tabs.Tab value="organization">Organization</Tabs.Tab>
          <Tabs.Tab value="account">Account</Tabs.Tab>
          <Tabs.Tab value="advanced">Advanced Settings</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="user">
          <ProfileSettings />
        </Tabs.Panel>
        <Tabs.Panel value="organization">
          <OrgSettings />
        </Tabs.Panel>
        <Tabs.Panel value="account">
          <AccountSettings />
        </Tabs.Panel>
        <Tabs.Panel value="advanced">
          <AdvancedSettings />
        </Tabs.Panel>
      </StyledTabs>
    );
  } else {
    return <ProfileSettings />;
  }
};

export default Settings;
