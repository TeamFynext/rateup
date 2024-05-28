import { Stack, Title, Tabs } from "@mantine/core";
import { useState } from "react";
import StripeSubscription from "./StripeSubscription";
import StripeProducts from "./StripeProducts";

enum StripeTabs {
  products = "Products",
  subscriptions = "Subscriptions",
}
const index = () => {
  const [activeTab, setActiveTab] = useState<StripeTabs>(StripeTabs.products);
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
            Products
          </Tabs.Tab>
          <Tabs.Tab
            value={StripeTabs.subscriptions}
            c={
              activeTab === StripeTabs.subscriptions
                ? "var(--tertiary-color)"
                : "GrayText"
            }
          >
            Subscriptions
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
