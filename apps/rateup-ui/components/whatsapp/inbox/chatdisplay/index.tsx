import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Group, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import {
  useGetAssignedUserForContact,
  useGetMessagesByContactId,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useUser } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";

import { useIsChatDisplayOpen } from "../../../../pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import NothingFound from "../../../NothingFound/NothingFound";
import WaInboxChatDisplayBody from "./chatdisplayBody";
import WaInboxChatDisplayFooter, {
  WaInboxAssignUserFooter,
  WaInboxBlockedContactFooter,
} from "./chatdisplayFooter";
import WaInboxChatDisplayHeader from "./chatdisplayHeader";
import classes from "./styles.module.css";

export default function WaInboxChatDisplay({ smallScreen = false }) {
  const searchParams = useSearchParams();
  const { selectedContact: contact } = useContactStore();
  const { data, error } = useGetMessagesByContactId(
    searchParams.get("contactId") ?? contact?.id,
  );
  const messages =
    data?.pages
      .map((page) =>
        page.messages.toSorted(
          (a, b) =>
            new Date(a.waCreatedAt).getTime() -
            new Date(b.waCreatedAt).getTime(),
        ),
      )
      .flat() || [];

  const { data: assignedUsers } = useGetAssignedUserForContact(contact?.id);
  const { user } = useUser();
  const isAssignedToMe = useMemo(
    () =>
      assignedUsers &&
      !!assignedUsers?.find((c) => c.assignedUserId === user?.userId),
    [assignedUsers, user],
  );

  const isChatDisplayOpen = useIsChatDisplayOpen();
  const { translations } = useTranslations();
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div
      className={`${classes.wrapper} ${isChatDisplayOpen ? "chat-display-open" : ""}`}
    >
      {messages?.length >= 0 && contact ? (
        <div className={classes.inner_animated}>
          <WaInboxChatDisplayHeader
            contact={contact}
            smallScreen={smallScreen}
          />
          <WaInboxChatDisplayBody data={messages} smallScreen={smallScreen} />
          {contact?.blockedOnWhatsApp ? (
            <WaInboxBlockedContactFooter contact={contact} />
          ) : !assignedUsers?.length ? (
            <WaInboxAssignUserFooter contactId={contact?.id} user={user} />
          ) : isAssignedToMe ? (
            <WaInboxChatDisplayFooter contact={contact} />
          ) : (
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
          )}
        </div>
      ) : (
        <NothingFound text={translations["Select a chat to see messages"]} />
      )}
    </div>
  );
}
