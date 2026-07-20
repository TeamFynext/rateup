import { Prisma } from "../../../../generated/prisma/client.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { InboxStatus, WaMessageAssignStatus } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import { isTerminalInboxStatus } from "../../whatsapp/constants.js";
import { incrementConversationCount } from "../../stats/stats.service.js";
import { getLastCreatedConversationForContact } from "./conversation.service.js";

/// Conversation-session lifecycle.
///
/// A conversation is *open* while `closedAt IS NULL`; closing is terminal and a
/// contact who messages again gets a *new* conversation (see
/// `openConversationForContact` / `mirrorConversationStatusTx` for why closed
/// records are never resurrected). This module is the single place that decides
/// which conversation a message belongs to and the single creator of
/// conversation rows in the live message path:
///
///   - inbound messages always land in the open conversation, opening one if
///     none exists;
///   - agent inbox sends do the same (an agent writing to a closed thread
///     starts a new session);
///   - automated sends (campaign, template blast, flows) never open a session:
///     they attach to an open conversation if one exists and otherwise stay
///     unthreaded (`conversationId = null`) until the next session-open sweeps
///     them in.

export type OpenTrigger = "inbound" | "agent";

/// The conversation a message belongs to right now: the one that has not been
/// closed. `closedAt` is the openness predicate -- `status` mirrors it (via
/// `conversationStatusData`) but the timestamp is what the DB-level
/// one-open-per-contact invariant is declared on.
export async function getOpenConversation(contactId: string) {
  return await prisma.conversation.findFirst({
    where: { contactId, closedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

/// Returns the contact's open conversation, opening a new one when none exists.
///
/// Opening also sweeps in *orphan* messages -- automated sends written while no
/// conversation was open (`conversationId IS NULL`) -- so the new session's
/// transcript and denormalized metrics include the outbound messages that led
/// up to it.
///
/// Concurrency: two webhook deliveries can race past the `getOpenConversation`
/// check. The partial unique index on `Conversation(contactId) WHERE closedAt
/// IS NULL` makes the second create fail with P2002, which is caught and
/// resolved by re-reading the winner's row.
export async function getOrOpenConversation(
  contactId: string,
  orgId: string,
  opts: {
    trigger: OpenTrigger;
    userId?: string;
    status?: InboxStatus;
    /// Auto-assign this user on open (agent sends to a closed thread claim the
    /// new session). Conversation-side only: the caller owns the legacy
    /// `WaInboxAssign` / `Contact.waMessageAssignStatus` dual-writes.
    assign?: { userId: string; teamId: string };
  },
): Promise<{ conversation: Awaited<ReturnType<typeof getOpenConversation>>; opened: boolean }> {
  const existing = await getOpenConversation(contactId);
  if (existing) return { conversation: existing, opened: false };

  const status = opts.status ?? WaMessageAssignStatus.UNASSIGNED;
  if (isTerminalInboxStatus(status)) {
    throw new Error(`Cannot open a conversation in terminal status ${status}`);
  }

  try {
    const conversation = await prisma.$transaction(async (tx) => {
      const previous = await tx.conversation.findFirst({
        where: { contactId },
        orderBy: { createdAt: "desc" },
      });

      const created = await tx.conversation.create({
        data: {
          contactId,
          orgId,
          status,
          openTrigger: opts.trigger,
          openedBy: opts.trigger === "agent" ? (opts.userId ?? null) : null,
          reopenCount: previous ? previous.reopenCount + 1 : 0,
          ...(opts.assign
            ? {
                assignedAt: new Date(),
                assignedUsers: {
                  create: {
                    userId: opts.assign.userId,
                    teamId: opts.assign.teamId,
                    lastAssignedAt: new Date(),
                    lastAssignedBy: opts.userId ?? opts.assign.userId,
                    actionHistory: [
                      {
                        action: "assigned",
                        date: new Date(),
                        by: opts.userId ?? opts.assign.userId,
                        source: "session-open",
                      },
                    ],
                  },
                },
              }
            : {}),
        },
      });

      await sweepOrphanMessagesTx(tx, created.id, contactId, previous?.closedAt ?? null);

      return created;
    });
    // Opening a session is the billable event (usage meter + limit
    // notification). Best-effort and after commit, exactly like the counter's
    // own contract: a failure here must never roll back the opened conversation.
    // This is the single place the main ingress path (`getOrOpenConversation`)
    // increments it — `createConversation`/`openConversationForContact` in
    // conversation.service.ts also do, for callers that bypass this service.
    await incrementConversationCount(orgId);
    return { conversation, opened: true };
  } catch (e) {
    // Unique-violation on the one-open-per-contact index: a concurrent open
    // won. Their row is the session; use it.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await getOpenConversation(contactId);
      if (winner) return { conversation: winner, opened: false };
    }
    throw e;
  }
}

/// The subset of the client available inside `prisma.$transaction(fn)`.
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/// Links messages written while no conversation was open (automated sends,
/// pre-migration history since the last close) to the newly opened
/// conversation, and folds them into its denormalized metrics. INTERNAL
/// messages are linked for transcript completeness but excluded from metrics,
/// matching `addNewWaMessage`.
async function sweepOrphanMessagesTx(
  tx: TxClient,
  conversationId: string,
  contactId: string,
  since: Date | null,
) {
  // `waCreatedAt` is written at second precision (dayjs().utc().format())
  // while `closedAt` carries milliseconds, so an orphan created in the same
  // second as the previous close would compare as "before" it. One second of
  // slack keeps the boundary correct; anything orphaned genuinely inside the
  // previous session's window is pre-migration history for the backfill.
  const orphanWhere = {
    contactId,
    conversationId: null,
    ...(since ? { waCreatedAt: { gt: new Date(since.getTime() - 1000) } } : {}),
  };

  const swept = await tx.waMessage.updateMany({
    where: orphanWhere,
    data: { conversationId },
  });
  if (swept.count === 0) return;

  const metrics = await tx.waMessage.aggregate({
    where: {
      conversationId,
      OR: [{ sourcePlatform: null }, { sourcePlatform: { not: PlatformType.INTERNAL } }],
    },
    _count: { _all: true },
    _max: { waCreatedAt: true },
  });
  const agentMax = await tx.waMessage.aggregate({
    where: {
      conversationId,
      sendBy: { not: null },
      OR: [{ sourcePlatform: null }, { sourcePlatform: { not: PlatformType.INTERNAL } }],
    },
    _max: { waCreatedAt: true },
  });
  const customerMax = await tx.waMessage.aggregate({
    where: {
      conversationId,
      sendBy: null,
      OR: [{ sourcePlatform: null }, { sourcePlatform: { not: PlatformType.INTERNAL } }],
    },
    _max: { waCreatedAt: true },
  });

  await tx.conversation.update({
    where: { id: conversationId },
    data: {
      messageCount: metrics._count._all,
      lastMessageAt: metrics._max.waCreatedAt,
      lastAgentMessageAt: agentMax._max.waCreatedAt,
      lastCustomerMessageAt: customerMax._max.waCreatedAt,
    },
  });
}

/// Back-compat wrapper for callers that predate `getOrOpenConversation` and
/// only ever ran on the inbound path.
export async function getActiveOrOpenConversation(contactId: string, orgId: string) {
  const { conversation } = await getOrOpenConversation(contactId, orgId, { trigger: "inbound" });
  return conversation;
}

export { getLastCreatedConversationForContact };
