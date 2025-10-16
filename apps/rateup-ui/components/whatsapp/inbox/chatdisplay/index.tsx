"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { Flex, Group, Paper, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import {
  useGetAssignedUserForContact,
  useGetMessagesByContactId,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { useUser } from "@/context/UserContext";

import NothingFound from "../../../NothingFound/NothingFound";
import { useChatFilterStore } from "../chatselect/chatFilter";
import WhatsAppInboxLoader from "../loader";
import WaInboxChatDisplayBody from "./chatdisplayBody";
import WaInboxChatDisplayFooter, {
  WaInboxAssignUserFooter,
  WaInboxBlockedContactFooter,
} from "./chatdisplayFooter";
import WaInboxChatDisplayHeader from "./chatdisplayHeader";
import WaInboxContactDetails from "./contactDetails";
import classes from "./styles.module.css";

export default function WaInboxChatDisplay({
  smallScreen = false,
  waSettings,
}: {
  smallScreen?: boolean;
  waSettings?: any;
}) {
  const contact = useContactsStore((s) => s.selectedContact);
  const { filter } = useChatFilterStore();

  const { data, error, isPending, isFetching, isFetched } =
    useGetMessagesByContactId(contact?.id, filter?.phone);
  const { messagesByKey, selectedKey } = useMessagesStore();

  const { data: assignedUsers } = useGetAssignedUserForContact(contact?.id);
  const { user } = useUser();
  const isAssignedToMe = useMemo(
    () =>
      assignedUsers &&
      !!assignedUsers?.find((c) => c.assignedUserId === user?.userId),
    [assignedUsers, user],
  );

  const translations = useTranslations();
  if (error) return <div>Error: {error.message}</div>;

  let footerContent = null;
  if (contact?.blockedOnWhatsApp) {
    footerContent = <WaInboxBlockedContactFooter contact={contact} />;
  } else if (!assignedUsers?.length) {
    footerContent = (
      <WaInboxAssignUserFooter contactId={contact?.id} user={user} />
    );
  } else if (isAssignedToMe) {
    footerContent = <WaInboxChatDisplayFooter contact={contact} />;
  } else {
    footerContent = (
      <Group
        bg={"black"}
        justify="center"
        c={"white"}
        color="white"
        gap={2}
        py={2}
      >
        <IconExclamationCircle size={"1rem"} />
        <Text size="xs">This chat is not assigned to you</Text>
      </Group>
    );
  }

  const showLoading =
    !messagesByKey?.get(selectedKey)?.messages?.length &&
    (isPending || (isFetching && !isFetched));

  return (
    <Paper withBorder p={0} className="h-full">
      {!contact ? (
        <NothingFound text={translations("Select a chat to see messages")} />
      ) : (
        <div className="sm:flex h-full w-full">
          <div className={classes.inner_animated}>
            <WaInboxChatDisplayHeader
              contact={contact}
              smallScreen={smallScreen}
              waSettings={waSettings}
            />
            {showLoading ? (
              <WhatsAppInboxLoader isLoading={showLoading} />
            ) : (
              <WaInboxChatDisplayBody smallScreen={smallScreen} />
            )}
            {!showLoading && footerContent}
          </div>
          <WaInboxContactDetails contact={contact} />
        </div>
      )}
    </Paper>
  );
}
