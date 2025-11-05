"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Flex, Group, Paper, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { MessageSquare } from "lucide-react";
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

  const { user } = useUser();
  const isAssignedToMe = useMemo(
    () =>
      contact && !!contact.assignedUsers?.find((c) => c.id === user?.userId),
    [contact, user],
  );

  const translations = useTranslations();
  const { isLoading } = useMessagesStore();
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);

  let footerContent = null;
  if (contact?.blockedOnWhatsApp) {
    footerContent = <WaInboxBlockedContactFooter contact={contact} />;
  } else if (!contact?.assignedUsers?.length) {
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
    <div className="h-full">
      {!contact ? (
        <div className="flex-1 flex items-center justify-center bg-muted/20 h-full">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="mb-2">
              {translations("Select a chat to see messages")}
            </h3>
          </div>
        </div>
      ) : (
        <div className={`flex min-w-0 h-full flex-1}`}>
          <div className="flex-1 flex flex-col min-w-0">
            <WaInboxChatDisplayHeader
              contact={contact}
              smallScreen={smallScreen}
              waSettings={waSettings}
            />
            <WaInboxChatDisplayBody
              smallScreen={smallScreen}
              isContactDetailsOpened={showCustomerInfo}
            />
            {!isLoading && footerContent}
          </div>
          <WaInboxContactDetails
            contact={contact}
            groupId={""}
            isOpen={showCustomerInfo}
            setIsOpen={setShowCustomerInfo}
          />
        </div>
      )}
    </div>
  );
}
