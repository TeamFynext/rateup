import { useState } from "react";

import { Flex, Stack, Tabs } from "@mantine/core";

import LoyaltySettings from "@/components/loyalty/LoyaltySettings";
import RegisterPageShare from "@/components/loyalty/RegisterPageShare";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import styles from "@/components/Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

import Actions from "../actions";
import Rewards from "../reward";

enum LoyaltySettingTabs {
  Actions = "Actions",
  Rewards = "Rewards",
  Settings = "Settings",
}
const index = () => {
  const [activeTab, setActiveTab] = useState(LoyaltySettingTabs.Actions);
  return (
    <Tabs
      classNames={styles}
      value={activeTab}
      onChange={(value) => setActiveTab(value as LoyaltySettingTabs)}
    >
      <Flex justify={"center"}>
        <Tabs.List justify="center">
          {Object.values(LoyaltySettingTabs).map((tab) => (
            <Tabs.Tab px={"xl"} py={"sm"} value={tab}>
              {tab}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Flex>

      <Tabs.Panel value={LoyaltySettingTabs.Actions} mt={"sm"}>
        <Actions />
      </Tabs.Panel>
      <Tabs.Panel value={LoyaltySettingTabs.Rewards} mt={"sm"}>
        <Rewards />
      </Tabs.Panel>
      <Tabs.Panel value={LoyaltySettingTabs.Settings} mt={"md"}>
        <Stack gap={"md"}>
          <PaperLayout>
            <RegisterPageShare />
          </PaperLayout>
          <LoyaltySettings />
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
};

export default index;
