import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Group, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useGetAssignedUserForContact,
  useGetMessagesByContactId,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { useUser } from "@/context/UserContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";

import { useIsChatDisplayOpen } from "../../../../pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import NothingFound from "../../../NothingFound/NothingFound";
import { useChatFilterStore } from "../chatselect/chatFilter";
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
  const { filter } = useChatFilterStore();
  const { data, error } = useGetMessagesByContactId(
    searchParams.get("contactId") ?? contact?.id,
    filter?.phone,
  );
  const messages = useMemo(
    () =>
      data?.pages
        .map((page) =>
          page?.messages?.toSorted(
            (a, b) =>
              new Date(a.waCreatedAt).getTime() -
              new Date(b.waCreatedAt).getTime(),
          ),
        )
        .flat() || [],
    [data],
  );

  const { data: assignedUsers } = useGetAssignedUserForContact(contact?.id);
  const { user } = useUser();
  const isAssignedToMe = useMemo(
    () =>
      assignedUsers &&
      !!assignedUsers?.find((c) => c.assignedUserId === user?.userId),
    [assignedUsers, user],
  );

  const isChatDisplayOpen = useIsChatDisplayOpen();
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

  return (
    <div
      className={`${classes.wrapper} ${isChatDisplayOpen ? "chat-display-open" : ""} p-1`}
    >
      <PaperLayout p={0} className="h-full">
        {messages?.length >= 0 && contact ? (
          <div className={classes.inner_animated}>
            <WaInboxChatDisplayHeader
              contact={contact}
              smallScreen={smallScreen}
            />
            <WaInboxChatDisplayBody data={messages} smallScreen={smallScreen} />
            {footerContent}
          </div>
        ) : (
          <NothingFound text={translations("Select a chat to see messages")} />
        )}
      </PaperLayout>
    </div>
  );
}
