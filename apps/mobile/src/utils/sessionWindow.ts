import dayjs from "dayjs";

/**
 * Whether the contact's 24h reply window is open, measured from their last inbound
 * message. A free-form reply (and so any attachment) can only be sent inside it.
 *
 * Safe to run against cached data: a stale timestamp can only make the window look
 * *more* expired, never less.
 */
export function isSessionWindowOpen(contact: { lastReceivedMessageTimeStamp?: string | null }) {
  if (!contact?.lastReceivedMessageTimeStamp) return false;
  return dayjs(contact.lastReceivedMessageTimeStamp).add(24, "hour").diff(dayjs(), "minute") > 0;
}
