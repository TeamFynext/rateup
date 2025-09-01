"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Stack, Tabs, Title } from "@mantine/core";

import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import RazorpayPlans from "./plans";
import RazorpaySubscriptions from "./subscriptions";

enum RazorpayTabs {
  plans = "Plans",
  subscriptions = "Subscriptions",
}
const index = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RazorpayTabs>(RazorpayTabs.plans);

  return (
    <Stack>
      <Title order={3}>Razorpay Dashboard</Title>
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as RazorpayTabs)}
        keepMounted={false}
        styles={{ tab: { fontSize: "18px", borderBottomWidth: "3px" } }}
      >
        <Tabs.List>
          <Tabs.Tab
            value={RazorpayTabs.plans}
            c={
              activeTab === RazorpayTabs.plans
                ? "var(--tertiary-color)"
                : "GrayText"
            }
          >
            Plans
          </Tabs.Tab>
          <Tabs.Tab
            value={RazorpayTabs.subscriptions}
            c={
              activeTab === RazorpayTabs.subscriptions
                ? "var(--tertiary-color)"
                : "GrayText"
            }
          >
            Subscriptions
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={RazorpayTabs.plans}>
          <RazorpayPlans />
        </Tabs.Panel>
        <Tabs.Panel value={RazorpayTabs.subscriptions}>
          <RazorpaySubscriptions />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default index;
