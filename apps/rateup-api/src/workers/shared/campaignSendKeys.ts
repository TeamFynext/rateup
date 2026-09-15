/**
 * Redis key names for campaign send sessions.
 *
 * Deliberately its own module with no imports. The obvious home for this is
 * `workers/shared/whatsapp/index.ts` beside `enqueueCampaignMessages`, but
 * `queues/campaign.queue.ts` needs it too — and the queues directory is
 * imported from all over the API (see AGENTS.md: "safe to import anywhere").
 * Reaching into the WhatsApp module from there drags Prisma, the Meta send
 * client and its channel table into every route that touches a queue.
 */

/** The set holding the ids of every job in one send session's fan-out. */
export const campaignSendJobsKey = (campaignSendId: string) =>
  `campaignSend:${campaignSendId}:jobs`;

/**
 * Set when a send session is stopped because the account cannot send.
 *
 * Checked by the dispatcher before every message, so a job that was already
 * past the queue — or fanned out by an enqueue that raced the pause — does not
 * go on to Meta. Keyed by send rather than by campaign so resuming needs no
 * cleanup: sending again opens a new session with a new id.
 */
export const campaignSendPausedKey = (campaignSendId: string) =>
  `campaignSend:${campaignSendId}:paused`;

/**
 * The BullMQ job id for one participant's message in one send session.
 *
 * Underscore-separated, and that is load-bearing: BullMQ rejects a custom job id
 * containing `:` outright ("Custom Id cannot contain :"), because that is the
 * Redis key separator. This was built with a colon, so `addBulk` threw for every
 * campaign, every send failed in the fan-out, and — because the catch logged the
 * error with `%o` — it printed as `{}`.
 *
 * Both halves are fixed-length uuids, so a `_` join stays unambiguous even
 * though uuids contain hyphens of their own.
 */
export const campaignSendJobId = (campaignSendId: string, participantId: string) =>
  `${campaignSendId}_${participantId}`;
