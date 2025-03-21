import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { motion } from "motion/react";

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
} from "./chatdisplayFooter";
import WaInboxChatDisplayHeader from "./chatdisplayHeader";
import classes from "./styles.module.css";

export default function WaInboxChatDisplay({ smallScreen = false }) {
  const searchParams = useSearchParams();
  const {
    selectedContact: contact,
    opened,
    selectedTicket,
  } = useContactStore();
  const { data, error } = useGetMessagesByContactId(
    (searchParams.get("contactId") as string) ?? contact?.id,
  );
  const messages =
    data?.pages
      .map((page) =>
        page.messages.sort(
          (a, b) =>
            new Date(a.waCreatedAt).getTime() -
            new Date(b.waCreatedAt).getTime(),
        ),
      )
      .flat() || [];

  // Animation variants
  const variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        type: "spring", // Use a spring animation for a more natural feel
        damping: 20, // Increase damping to make the animation more subtle
        stiffness: 100, // Decrease stiffness to make the animation slower
      },
    },
  };

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
        <motion.div
          key={contact?.phone} // Add a unique key for the contact
          variants={variants} // Add the animation variants
          initial="hidden" // Initial state
          animate="show" // State when component is mounted
          className={classes.inner_animated}
          layout
        >
          <WaInboxChatDisplayHeader
            contact={contact}
            smallScreen={smallScreen}
          />
          {/* <Flex gap={opened && "xs"} p={0}>
            <motion.div
              key={contact?.phone}
              initial={{ flex: 1, opacity: 1 }}
              animate={
                opened ? { flex: 0.5, opacity: 1 } : { flex: 1, opacity: 1 }
              }
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              style={{
                overflow: "hidden",
              }}
            >
              <Stack h="78vh" gap={0} p={0}> */}
          <WaInboxChatDisplayBody data={messages} smallScreen={smallScreen} />
          {!assignedUsers?.length ? (
            <WaInboxAssignUserFooter contactId={contact?.id} user={user} />
          ) : (
            <WaInboxChatDisplayFooter
              contact={contact}
              isChatAssignedToMe={isAssignedToMe}
            />
          )}
          {/* </Stack>
            </motion.div>

            <motion.div
              key={selectedTicket}
              initial={{ flex: 0, x: 300, opacity: 0 }}
              animate={
                opened
                  ? { flex: 0.5, x: 0, opacity: 1 }
                  : { flex: 0, x: 300, opacity: 0 }
              }
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              style={{
                overflow: "hidden",
                pointerEvents: opened ? "auto" : "none",
              }}
            >
              <WaInboxChatDisplayPopoverMsg />
            </motion.div>
          </Flex> */}
        </motion.div>
      ) : (
        <NothingFound text={translations["Select a chat to see messages"]} />
      )}
    </div>
  );
}
