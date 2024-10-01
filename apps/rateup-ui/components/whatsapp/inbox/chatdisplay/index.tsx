import { motion } from "framer-motion";

import useTranslations from "@/dictionaries/useTranslation";

import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useIsChatDisplayOpen } from "../../../../pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import NothingFound from "../../../NothingFound/NothingFound";
import WaInboxChatDisplayBody from "./chatdisplayBody";
import WaInboxChatDisplayFooter from "./chatdisplayFooter";
import WaInboxChatDisplayHeader from "./chatdisplayHeader";
import classes from "./styles.module.css";

export default function WaInboxChatDisplay({
  messages,
  contact,
}: {
  messages: WaGetMessagesBody[];
  contact: ContactsWithLastMessage;
}) {
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

  const isChatDisplayOpen = useIsChatDisplayOpen();
  const { translations } = useTranslations();
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
          <WaInboxChatDisplayHeader contact={contact} />
          <WaInboxChatDisplayBody data={messages} />
          <WaInboxChatDisplayFooter contact={contact} />
        </motion.div>
      ) : (
        <NothingFound text={translations["Select a chat to see messages"]} />
      )}
    </div>
  );
}
