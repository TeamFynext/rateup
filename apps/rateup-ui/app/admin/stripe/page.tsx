"use client";

import { useState } from "react";

import { Stack, Tabs, Title } from "@mantine/core";
import { useTranslations } from "next-intl";

import StripeProducts from "./StripeProducts";
import StripeSubscription from "./StripeSubscription";

enum StripeTabs {
  products = "Products",
  subscriptions = "Subscriptions",
}
const index = () => {
  const [activeTab, setActiveTab] = useState<StripeTabs>(StripeTabs.products);
  const translations = useTranslations();
  return (
    <Stack>
      <Title order={3}>Stripe Dashboard</Title>
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as StripeTabs)}
        keepMounted={false}
        styles={{ tab: { fontSize: "18px", borderBottomWidth: "3px" } }}
      >
        <Tabs.List>
          <Tabs.Tab
            value={StripeTabs.products}
            c={
              activeTab === StripeTabs.products
                ? "var(--tertiary-color)"
                : "GrayText"
            }
          >
            {translations("Products")}
          </Tabs.Tab>
          <Tabs.Tab
            value={StripeTabs.subscriptions}
            c={
              activeTab === StripeTabs.subscriptions
                ? "var(--tertiary-color)"
                : "GrayText"
            }
          >
            {translations("Subscriptions")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={StripeTabs.products}>
          <StripeProducts />
        </Tabs.Panel>
        <Tabs.Panel value={StripeTabs.subscriptions}>
          <StripeSubscription />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default index;
