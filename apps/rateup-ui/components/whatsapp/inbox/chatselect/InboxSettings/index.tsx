import React, { useCallback } from "react";
import { useRouter } from "next/router";

import { ActionIcon, HoverCard, Stack, Tabs, Text } from "@mantine/core";
import {
  IconDownload,
  IconFilter,
  IconSettings,
  IconUser,
  IconUserPlus,
  IconUserShield,
} from "@tabler/icons-react";

import { WaInboxMessage } from "@/types/global";
import { useUser } from "@/context/UserContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { UserRole } from "@/utils/enums";

import AddUnknownContactModal, {
  AddUnknownContactForm,
} from "../addUnknownContactModal";
import WaInboxChatExport from "../chatExport";
import WaInboxChatFilter from "../chatFilter";
import AutoAssignChat from "../permissions";
import WaInboxPermissions from "../permissions";

const InboxSettings = ({ tab }) => {
  const { setSelectedContact, filterData } = useContactStore();
  const router = useRouter();
  const openChatDisplayForContact = useCallback(
    (data: Partial<ContactsData>) => {
      router.push(`/dashboard/whatsapp/inbox?tab=&${tab}contactId=${data.id}`);
    },
    [router],
  );
  const onUnknownContactAddSuccess = useCallback(
    (contact: ContactsData) => {
      setSelectedContact({
        ...contact,
        groups: [],
        lastReceivedMessageTimeStamp: "",
        lastMessage: {
          messageBody: {} as WaInboxMessage,
          waCreatedAt: "",
        },
        assignedUsers: [],
      });
      openChatDisplayForContact(contact);
    },
    [openChatDisplayForContact, setSelectedContact],
  );
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
            <Tabs.Tab value="filter" leftSection={<IconFilter size={18} />}>
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
              <WaInboxChatFilter tab={tab} />
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
