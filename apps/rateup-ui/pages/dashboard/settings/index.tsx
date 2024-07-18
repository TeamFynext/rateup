import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Tabs } from "@mantine/core";

import { useRouteAndCartStore } from "../../../components/HomePage/pages/Pricing/store/RouteAndCartStore";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { useUser } from "../../../context/UserContext";
import { useCheckSession } from "../../../hooks/checkSession";
import { retrieveRole } from "../../../utils/essential";
import AccountSettings from "./AccountSettings";
import OrgSettings from "./OrgSettings";
import ProfileSettings from "./UserSettings";

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
      </StyledTabs>
    );
  } else {
    return <ProfileSettings />;
  }
};

export default Settings;
