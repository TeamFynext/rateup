import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { HttpError } from "../../../utils/http.js";
import { sendViaWstoOrgHandler } from "../../settings/org/ws/org.ws.controller.js";
import { sendSenderAction } from "./senderAction.js";

/**
 * How long one typing bubble on the customer's side counts as still showing.
 * WhatsApp hides it after 25 s, so re-sending every 20 s keeps it up while the
 * agent keeps typing, at most three Graph calls a minute per conversation.
 */
const UPSTREAM_TYPING_TTL_SEC = 20;

const upstreamKey = (orgId: string, contactId: string) => `inbox:typing:${orgId}:${contactId}`;

export interface AgentTypingInput {
  orgId: string;
  userId: string;
  contactId: string;
  conversationId?: string | null;
  typing: boolean;
  /**
   * The agent just sent their reply. The reply hides the customer's bubble by
   * itself, and an explicit `typing_off` could reach Meta before the queued
   * message does.
   */
  sent?: boolean;
}

/**
 * An agent started or stopped typing a reply in the inbox.
 *
 * Teammates hear it over the inbox socket on every call. The customer sees a
 * typing bubble on WhatsApp, Instagram or Messenger, throttled so a typing
 * burst costs one Graph call per {@link UPSTREAM_TYPING_TTL_SEC}.
 */
export async function setAgentTyping(input: AgentTypingInput) {
  const { orgId, userId, contactId, typing } = input;

  const [contact, user] = await Promise.all([
    prisma.contact.findFirst({ where: { id: contactId, orgId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ]);
  if (!contact) throw new HttpError("Contact not found", 404);

  await sendViaWstoOrgHandler(
    orgId,
    {
      type: "inbox_typing",
      inbox_typing: {
        contactId,
        conversationId: input.conversationId ?? null,
        userId,
        userName: user?.name || user?.email?.split("@")[0] || null,
        typing,
        at: new Date().toISOString(),
      },
    },
    "main",
  );

  // Meta is best-effort: a failed bubble must never fail the agent's typing.
  void sendUpstreamTyping(input).catch((err) =>
    log.warn({ err, orgId, contactId }, "Failed to send the typing indicator to Meta"),
  );
}

async function sendUpstreamTyping({ orgId, contactId, typing, sent }: AgentTypingInput) {
  const key = upstreamKey(orgId, contactId);

  if (typing) {
    // One bubble per window, whichever agent or tab asked first.
    const claimed = await redis.set(key, "1", "EX", UPSTREAM_TYPING_TTL_SEC, "NX");
    if (claimed !== "OK") return;
    const shown = await sendSenderAction(contactId, "typing_on", { orgId });
    // Nothing went out (closed window, webchat). Keep the slot so the next
    // heartbeat does not look again, but mark it so typing-off skips Meta.
    if (!shown) await redis.set(key, "0", "KEEPTTL");
    return;
  }

  // Only take down a bubble we put up.
  const shown = await redis.getdel(key);
  if (shown !== "1" || sent) return;
  await sendSenderAction(contactId, "typing_off", { orgId });
}
