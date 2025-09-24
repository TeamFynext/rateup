"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs } from "@mantine/core";
import { useTranslations } from "next-intl";

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
  const translations = useTranslations();
  const session = useCheckSession();
  const { user } = useUser();
  const searchParams = useSearchParams();
  if (!session || !user) return;

  const tab = searchParams.get("tab") || "account";
  if (retrieveRole(user?.role) === "Super Admin") {
    return (
      <StyledTabs
        value={tab}
        onChange={(value) => router.push(`?tab=${value}`)}
        w="100%"
      >
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
