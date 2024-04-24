import classes from "./styles.module.css";
import NothingFound from "../../../NothingFound/NothingFound";
import WaInboxChatDisplayHeader from "./chatdisplayHeader";
import WaInboxChatDisplayFooter from "./chatdisplayFooter";
import WaInboxChatDisplayBody from "./chatdisplayBody";
import { WaGetMessagesBody } from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { motion } from "framer-motion";
import { useContactById } from "../../../../backend/campaign/contacts/contacts.query";
export default function WaInboxChatDisplay({
  messages,
  contactId,
}: {
  messages: WaGetMessagesBody[];
  contactId: string;
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

  const { data: contact } = useContactById(contactId);
  if (!contact) return null;

  return (
    <div className={classes.wrapper}>
      {messages?.length >= 0 ? (
        <motion.div
          key={contact?.phone} // Add a unique key for the contact
          variants={variants} // Add the animation variants
          initial="hidden" // Initial state
          animate="show" // State when component is mounted
          className={classes.inner_animated}
        >
          <WaInboxChatDisplayHeader contactId={contactId} />
          <WaInboxChatDisplayBody data={messages} />
          <WaInboxChatDisplayFooter contactId={contactId} />
        </motion.div>
      ) : (
        <NothingFound text="Select a chat to see messages" />
      )}
    </div>
  );
}
