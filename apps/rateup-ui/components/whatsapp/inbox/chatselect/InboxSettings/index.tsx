"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  HoverCard,
  Indicator,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconDownload,
  IconFilter,
  IconSettings,
  IconUser,
  IconUserPlus,
  IconUserShield,
} from "@tabler/icons-react";

import { WaInboxMessage } from "@/types/global";
import useContactStore from "@/app/dashboard/whatsapp/inbox/store";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

import AddUnknownContactModal, {
  AddUnknownContactForm,
} from "../addUnknownContactModal";
import WaInboxChatExport from "../chatExport";
import WaInboxChatFilter from "../chatFilter";
import AutoAssignChat from "../permissions";
import WaInboxPermissions from "../permissions";

const InboxSettings = ({ tab, onUnknownContactAddSuccess }) => {
  const { setSelectedContact, filterData } = useContactStore();
  const [filterCount, setFilterCount] = useState(0);
  const { user } = useUser();
  return (
    <HoverCard shadow="md">
      <HoverCard.Target>
        <ActionIcon variant="light">
          <IconSettings />
        </ActionIcon>
      </HoverCard.Target>
      <HoverCard.Dropdown p={0} w={670}>
        <Tabs defaultValue="filter" orientation="vertical" variant="pills">
          <Tabs.List bg={"var(--wa-gray)"}>
            <Tabs.Tab
              value="filter"
              leftSection={
                <Indicator
                  label={filterCount}
                  color="var(--wa-green)"
                  inline
                  size={16}
                >
                  <IconFilter size={18} />
                </Indicator>
              }
            >
              Filter
            </Tabs.Tab>
            <Tabs.Tab value="contact" leftSection={<IconUserPlus size={18} />}>
              Add new Contact
            </Tabs.Tab>
            <Tabs.Tab value="download" leftSection={<IconDownload size={18} />}>
              Download Chat
            </Tabs.Tab>
            {user && user.role === UserRole.SUPADM && (
              <Tabs.Tab
                value="assign"
                leftSection={<IconUserShield size={18} />}
              >
                Permissions
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="filter" p={"md"}>
            <Stack>
              <Text size="sm" fw={600}>
                Filter Whatsapp Chats
              </Text>
              <WaInboxChatFilter tab={tab} setFilterCount={setFilterCount} />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="download" p={"md"}>
            <WaInboxChatExport filter={filterData} />
          </Tabs.Panel>
          <Tabs.Panel value="assign" p={"md"}>
            <WaInboxPermissions />
          </Tabs.Panel>
          <Tabs.Panel value="contact" p={"md"}>
            <Stack>
              <Text size="sm" fw={600}>
                Add New Contact
              </Text>
              <AddUnknownContactForm
                phone=""
                triggerType="action_button"
                successCallback={onUnknownContactAddSuccess}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

export default InboxSettings;
