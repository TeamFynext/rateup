import dayjs from "dayjs";
import { getContactChannelSource } from "@/utils/chatbox_utils";
import { contactMessagingWindow } from "@/utils/messagingWindow";

type SessionContact = Parameters<typeof getContactChannelSource>[0] & {
  lastReceivedMessageTimeStamp?: string | null;
  adThreadUntil?: string | null;
};

/**
 * Whether an agent can send a free-form reply (and so any attachment) to this contact,
 * measured from their last inbound message:
 * - WhatsApp: the 24h session.
 * - Instagram and Messenger: 24h, then up to 7 days for a person (Meta's Human Agent tag).
 *
 * The inbox list, the chat screen and the share sheet all use this, so they agree.
 * Safe to run against cached data: a stale timestamp can only make the window look
 * *more* expired, never less.
 */
export function isSessionWindowOpen(contact: SessionContact) {
  if (!contact?.lastReceivedMessageTimeStamp) return false;
  const { platform } = getContactChannelSource(contact);
  const metaWindow = contactMessagingWindow(contact, platform);
  if (metaWindow) return metaWindow.state !== "closed";
  return dayjs(contact.lastReceivedMessageTimeStamp).add(24, "hour").diff(dayjs(), "minute") > 0;
}
