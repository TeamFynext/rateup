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
  const searchParams = useSearchParams();

  const contact = useContactsStore((s) => s.selectedContact);
  const { filter } = useChatFilterStore();
  const currentContactId = contact?.id || searchParams.get("contactId");

  const { data, error, isPending, isFetching, isFetched } =
    useGetMessagesByContactId(currentContactId, filter?.phone);

  const messages = useMemo(
    () =>
      !isPending && data
        ? data.pages
            .map((page) =>
              page?.messages?.toSorted(
                (a, b) =>
                  new Date(a.waCreatedAt).getTime() -
                  new Date(b.waCreatedAt).getTime(),
              ),
            )
            .flat()
        : [],
    [data, isPending],
  );

  const { data: assignedUsers } = useGetAssignedUserForContact(contact?.id);
  const { user } = useUser();
  const isAssignedToMe = useMemo(
    () =>
      assignedUsers &&
      !!assignedUsers?.find((c) => c.assignedUserId === user?.userId),
    [assignedUsers, user],
  );

  const translations = useTranslations();
  // if (error) return <div>Error: {error.message}</div>;

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

  const showLoading = isPending || (isFetching && !isFetched);

  return (
    <Paper withBorder p={0} className="h-full">
      {!contact ? (
        <NothingFound text={translations("Select a chat to see messages")} />
      ) : (
        <div className={classes.inner_animated}>
          <WaInboxChatDisplayHeader
            contact={contact}
            smallScreen={smallScreen}
            waSettings={waSettings}
          />
          <div className={"flex h-[calc(100%-49px)]"}>
            <div className="flex flex-1 flex-col">
              {showLoading ? (
                <WhatsAppInboxLoader isLoading={showLoading} />
              ) : (
                <WaInboxChatDisplayBody
                  data={messages}
                  smallScreen={smallScreen}
                />
              )}
              {!showLoading && footerContent}
            </div>
            <WaInboxContactDetails contact={contact} />
          </div>
        </div>
      )}
    </Paper>
  );
}
