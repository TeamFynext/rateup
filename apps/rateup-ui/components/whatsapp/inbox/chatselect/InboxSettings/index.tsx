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
import useContactStore, { useContactsStore } from "@/app/dashboard/inbox/store";
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
  return (
    <HoverCard shadow="md">
      <HoverCard.Target>
        <ActionIcon variant="light">
          <IconSettings />
        </ActionIcon>
      </HoverCard.Target>
      <HoverCard.Dropdown p={0} w={670}>
        <InboxChatFilterAndSettings tab={tab} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

export const InboxChatFilterAndSettings = ({ tab }) => {
  const { filterData } = useContactStore();
  const [filterCount, setFilterCount] = useState(0);
  const { user } = useUser();
  return (
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
        {user && user.role === UserRole.SUPADM && (
          <Tabs.Tab value="assign" leftSection={<IconUserShield size={18} />}>
            Permissions
          </Tabs.Tab>
        )}
      </Tabs.List>
      <Tabs.Panel value="filter" p={"md"}>
        <Stack>
          <Text size="sm" fw={600}>
            Filter Whatsapp Chats
          </Text>
          <WaInboxChatFilter setFilterCount={setFilterCount} />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="assign" p={"md"}>
        <WaInboxPermissions />
      </Tabs.Panel>
    </Tabs>
  );
};

export default InboxSettings;
