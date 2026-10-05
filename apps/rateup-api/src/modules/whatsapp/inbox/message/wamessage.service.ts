import {
  Campaign,
  Contact,
  ContactGroup,
  PlatformType,
  Prisma,
  WaAccountSettings,
  WaMessage,
} from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import {
  DateType,
  GenerateInboxResponseBody,
  WaChatExportConstraints,
  WaChatFilterSchema,
  WaMessageAssignBody,
} from "./wamessage.schema.js";
import { log } from "../../../../utils/logger.js";
import { callMetaApi } from "../../wa_axios.js";
import { getWaSettings, getWaSettingsByPhone } from "../../settings/wa_settings.service.js";
import { getScopedSourceIdentifiers } from "../../settings/wa_channel_access.js";
import type { Actor } from "../../../../authz/actor.js";
import axios from "axios";
import type { InboxStatus } from "../../../../types/enums.js";
import {
  CloseReason,
  WaAssignedChatPermission,
  WaMessageAssignStatus,
} from "../../../../types/enums.js";
import { updateContactById } from "../../../contact/contact.service.js";
import { internalEventSentence } from "./internalEvent.js";
import {
  findNoteTime,
  getThreadNotes,
  noteInclude,
  noteToThreadItem,
  type ThreadNote,
} from "../note/note.service.js";
import { wait } from "../../whatsappSurvey/wasurvey.controller.js";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service.js";
import {
  createReplyImageMessage,
  createDocumentMessage,
  createVideoMessage,
  createAudioMessage,
  createContactMessage,
  createLocationMessage,
} from "../../whatsappSurvey/wasurvey.utils.js";
import { WaMessageAssignStatusTab, WaMessageClosedStatus } from "../../constants.js";
import { getInboxCountsFromConversations } from "../inboxStats/inboxStats.service.js";
import { getTeamIdsByUserId } from "../../../team/team.service.js";
import { UserAvailabilityStatus } from "../../../user/user.schema.js";
import { notify } from "../../../notification/notify.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../../integrations/external/zapier/zapier.service.js";
import { faker } from "@faker-js/faker";
import {
  getConversationById,
  getLastCreatedConversationForContact,
  mirrorConversationStatusTx,
  openConversationForContact,
  resolveClosedByUserId,
  resolveInboxActor,
  setInboxStatus,
  updateConversationAssignees,
} from "../../../contact/conversation/conversation.service.js";
import { isTerminalInboxStatus, NOT_SPAM_EVENT } from "../../constants.js";
import { sendMessageQueue } from "../../../../workers/bullmq/queues/index.js";
import dayjs from "dayjs";
import { HttpError } from "../../../../utils/http.js";
import type {
  OutgoingTemplateComponent,
  WaSendMessageBody,
} from "../../../../types/whatsapp.types.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ByContactIdParams } from "../../../contact/contact.schema.js";
import { channelDigits, channelIdentifierSpellings } from "../../../../utils/channelIdentifier.js";
import { dateFilterFor } from "../../../apiAnalytics/apianalytics.service.js";
import { getInstagramChannel, getMessengerChannel } from "../../metaChannel/metaChannel.service.js";

/**
 * One row of the raw inbox-list query. The projection is built by hand in SQL and spread
 * wholesale into the response, so only the columns this file reads are named.
 */
interface InboxConversationRow {
  conversationId: string;
  lastMessageBody?: unknown;
  lastMessageWaCreatedAt?: Date | null;
  lastMessagePlatform?: string | null;
  lastMessageSourceIdentifier?: string | null;
  lastMessageDeletedAt?: Date | null;
  lastReceivedMetadata?: unknown;
  [column: string]: unknown;
}

/** One row of the per-conversation "latest 10 messages" query. */
interface InboxMessageRow {
  id: string;
  contactId: string;
  conversationId: string;
  waCreatedAt: Date;
  messageBody: unknown;
  sourcePlatform: string;
  sourceIdentifier: string | null;
  sendBy: string | null;
  stats: unknown;
  messageId: string | null;
  deletedAt: Date | null;
  senderName: string | null;
  senderProfilePhoto: string | null;
  templateComponentParams: unknown;
}

/** A message as it is handed back on the inbox list, with its sender flattened. */
type InboxThreadMessage = Omit<InboxMessageRow, "senderName" | "senderProfilePhoto"> & {
  sender: { name: string | null; profilePhoto: string | null } | null;
};

/** What a revoked message reads as wherever its content would otherwise appear. */
const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted";

function isWaMessageAssignStatusTabKey(key: string): key is keyof typeof WaMessageAssignStatusTab {
  return key in WaMessageAssignStatusTab;
}

/**
 * Links a sent message to the campaign participant it belongs to.
 *
 * Delivery statuses are matched back to a participant through this row (see
 * `bulkUpdateStatuses`), so a campaign send that skips it can never be reported
 * on.
 */
export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  sourcePlatform: PlatformType,
  sourceIdentifier: string | undefined,
  // Matches the nullable `WaMessage.conversationId` column — a message can
  // genuinely have no conversation yet (see `tracksMetrics` below, which already
  // treats a falsy `conversationId` as a real, handled case).
  conversationId: string | undefined,
  componentParams?: OutgoingTemplateComponent[],
  messageId?: string,
  sendBy?: string,
  failed: boolean = false,
  sourceMessage: string = "inbox",
  logs: WaGraphApiErrorDetail = {},
  // The 24h metered window this message belongs to, resolved by the caller before
  // the row is written so attribution lands on the same insert. Optional: metering
  // is best-effort and must never block the message.
  meteredConversationId?: string,
  // The campaign participant this message was sent for. Written as a nested
  // create on the same INSERT, never as a second statement: the status consumer
  // matches a receipt to its campaign through this row, and a `sent` receipt
  // that finds the message but not the link is acked as processed with the
  // campaign counters and participant status silently skipped. Meta's `sent`
  // lands within a second of the send, so the gap between two writes is one it
  // regularly wins.
  campaignLink?: {
    campaignParticipantId: string;
    campaignParticipantDripStageId?: string | null;
    // The send session this message belongs to. Every per-attempt number in the
    // analytics tab is derived from this column, so a send that leaves it null is
    // invisible to the attempts table even though the campaign totals move.
    campaignSendId?: string | null;
  },
) {
  const initialStats = {
    read: "",
    sent: "",
    failed: "",
    delivered: "",
  };
  if (sourcePlatform === PlatformType.WEBCHAT) {
    initialStats.sent = waCreatedAt;
    initialStats.delivered = waCreatedAt;
  }

  if (sourcePlatform === PlatformType.INSTAGRAM || sourcePlatform === PlatformType.FACEBOOK) {
    initialStats.sent = waCreatedAt;
  }

  if (failed) {
    initialStats.failed = waCreatedAt;
  }
  let statsData = {};
  if (
    failed ||
    sourcePlatform === PlatformType.WEBCHAT ||
    sourcePlatform === PlatformType.INSTAGRAM ||
    sourcePlatform === PlatformType.FACEBOOK
  ) {
    statsData = { stats: initialStats };
  }

  const createMessage = prisma.waMessage.create({
    data: {
      messageBody,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
      sendBy,
      sourcePlatform,
      sourceIdentifier,
      conversationId,
      meteredConversationId,
      ...statsData,
      sourceMessage,
      logs,
      // A send Meta rejected outright never reaches the status consumer — the row
      // is written with a NULL `messageId`, so no webhook can ever match it — and
      // the consumer was the only writer of `errorCode`. Every immediate
      // rejection therefore stored its code in `logs` and left the column NULL,
      // which is what the retry cohort (`errorCode = ANY(...)`) and the failure
      // breakdown both read: a campaign's send-time failures were unclassifiable
      // and so never retried. Persisting it here is what makes them visible.
      errorCode: typeof logs.code === "number" ? logs.code : null,
      ...(campaignLink
        ? {
            WaMessageCampaginParticipantMap: {
              create: {
                campaignParticipantId: campaignLink.campaignParticipantId,
                campaignParticipantDripStageId: campaignLink.campaignParticipantDripStageId ?? null,
                campaignSendId: campaignLink.campaignSendId ?? null,
              },
            },
          }
        : {}),
    },
    include: {
      sender: {
        select: {
          name: true,
          profilePhoto: true,
        },
      },
    },
  });

  // Keep the denormalized conversation metrics in step with the message that
  // produced them. INTERNAL messages (system notes, private notes) carry a
  // `sendBy` but are not agent replies, so they must not touch these counters.
  const tracksMetrics = Boolean(conversationId) && sourcePlatform !== PlatformType.INTERNAL;
  if (!tracksMetrics) return await createMessage;

  const messageAt = waCreatedAt ? new Date(waCreatedAt) : new Date();
  const [newMessage] = await prisma.$transaction([
    createMessage,
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: messageAt,
        // Direction is inferred from `sendBy`: null means inbound.
        ...(sendBy ? { lastAgentMessageAt: messageAt } : { lastCustomerMessageAt: messageAt }),
      },
    }),
  ]);

  return newMessage;
}

/**
 * The stored `sourceIdentifier` values on this contact's messages that are the
 * channel `phone` names, whatever spelling each was written in — plus `internal`,
 * which shares the column for assignment and status events and must never be
 * filtered out of a thread.
 *
 * Returns an empty condition for "all", so the thread is unfiltered.
 */
async function channelFilterForContact(contactId: string, phone?: string) {
  if (!phone || phone === "all") return {};

  const digits = channelDigits(phone);
  const stored = await prisma.waMessage.findMany({
    where: { contactId },
    select: { sourceIdentifier: true },
    distinct: ["sourceIdentifier"],
  });

  const spellings = stored
    .map((row) => row.sourceIdentifier)
    .filter((value): value is string => Boolean(value) && channelDigits(value) === digits);

  return { OR: [{ sourceIdentifier: { in: spellings } }, { sourceIdentifier: "internal" }] };
}

const THREAD_PAGE_SIZE = 50;

const messageTime = (message: Pick<WaMessage, "waCreatedAt" | "createdAt">) =>
  message.waCreatedAt ?? message.createdAt;

/** Slots notes (newest first) into a page of messages without reordering the messages. */
function interleave<M>(
  messages: M[],
  notes: ThreadNote[],
  timeOf: (message: M) => Date | null,
): (M | ThreadNote)[] {
  const thread: (M | ThreadNote)[] = [];
  let next = 0;
  for (const message of messages) {
    const at = timeOf(message);
    while (next < notes.length && at && notes[next]!.createdAt > at) {
      thread.push(notes[next++]!);
    }
    thread.push(message);
  }
  return thread.concat(notes.slice(next));
}

/**
 * One page of a thread: 50 messages, plus the notes that fall between them. The
 * cursor is still a message id, so a page covers the time from its oldest message up
 * to where the previous page stopped, and no note lands on two pages.
 */
export async function getWaMessagesByContactId(
  contactId: string,
  orgId: string,
  cursor: string | null,
  phone?: string,
  conversationId?: string | null,
) {
  /**
   * Narrow the thread to one channel, matching on digits. The spellings are
   * resolved from the contact's own rows rather than guessed: that is a small,
   * `contactId`-indexed read, and it keeps the paginated query below a plain
   * indexed equality instead of an expression Prisma cannot express.
   */
  const sourceIdentifierCondition = await channelFilterForContact(contactId, phone);
  // Scope the thread to one conversation (ticket). Legacy messages predate the
  // conversation backfill and carry a null conversationId — keep showing them so
  // an un-backfilled contact's history doesn't vanish; once backfilled, the null
  // branch matches nothing and the filter becomes strict.
  const conversationCondition = conversationId
    ? { OR: [{ conversationId }, { conversationId: null }] }
    : {};
  const where: Prisma.WaMessageWhereInput = {
    contactId,
    contact: { orgId },
    AND: [sourceIdentifierCondition, conversationCondition],
  };

  const cursorMessage = cursor
    ? await prisma.waMessage.findUnique({
        where: { id: cursor },
        select: { id: true, waCreatedAt: true, createdAt: true },
      })
    : null;
  // A client that loaded its thread before notes moved can hold a note id as its cursor.
  const cursorTime = cursorMessage
    ? messageTime(cursorMessage)
    : cursor
      ? await findNoteTime(cursor)
      : null;
  if (cursor && !cursorTime) {
    return { messages: [], nextCursor: null, hasNextPage: false };
  }

  const messages = await prisma.waMessage.findMany({
    take: THREAD_PAGE_SIZE,
    ...(cursorMessage
      ? { skip: 1, cursor: { id: cursorMessage.id }, where }
      : { where: cursorTime ? { AND: [where, { waCreatedAt: { lt: cursorTime } }] } : where }),
    include: { sender: { select: { name: true, profilePhoto: true } } },
    orderBy: { waCreatedAt: "desc" },
  });
  const hasNextPage = messages.length === THREAD_PAGE_SIZE;
  const lastMessage = messages.at(-1);

  const notes = await getThreadNotes({
    contactId,
    orgId,
    conversationId,
    from: hasNextPage && lastMessage ? messageTime(lastMessage) : null,
    before: cursorTime,
  });

  return {
    messages: interleave(messages, notes, messageTime),
    nextCursor: hasNextPage && lastMessage ? lastMessage.id : null,
    hasNextPage,
  };
}

export async function generateChatFilterData(orgId: string) {
  try {
    const [contactTags, tagsFromContacts, cGroups, campaigns] = await Promise.all([
      prisma.$queryRaw<Partial<WaAccountSettings>[]>`
    SELECT "contactTags" 
    FROM "WaAccountSettings" 
    WHERE "orgId" = ${orgId}::uuid`,
      prisma.$queryRaw<Array<Partial<Contact>>>`
    SELECT DISTINCT ON ("tags") "tags" 
    FROM "Contact" 
    WHERE "tags" <> '{}'::jsonb 
    AND "tags" NOTNULL 
    AND "orgId" = ${orgId}::uuid`,
      prisma.$queryRaw<Partial<ContactGroup>[]>`
    SELECT cg."id",cg."name" 
    FROM "ContactGroup" cg 
    INNER JOIN "Team" tm 
    ON cg."teamId" = tm.id 
    WHERE tm."orgId" = ${orgId}::uuid
    `,
      prisma.$queryRaw<Partial<Campaign>[]>`
    SELECT cn."id",cn."name" 
    FROM "Campaign" cn 
    INNER JOIN "Team" tm 
    ON cn."teamId" = tm."id" 
    WHERE "orgId" = ${orgId}::uuid`,
    ]);

    const groupData = {
      group: "Groups",
      items: cGroups?.map((item) => ({
        label: item?.name,
        value: `contactGroups|-${item?.id}`,
      })),
    };

    const campaignsData = {
      group: "Campaigns",
      items: campaigns?.map((item) => ({
        label: item?.name,
        value: `campaigns|-${item?.id}`,
      })),
    };
    const multiSelectTagsData =
      contactTags?.length > 0
        ? (contactTags[0]?.contactTags?.map((tag) => {
            const uniqueTags = new Set();
            tagsFromContacts?.forEach((t) => {
              // `Contact.tags` is a free-form JSON blob (keyed by the org's
              // configured contact-tag names), so its shape is only known at
              // runtime — hence the narrow-then-index below rather than a cast.
              const tags = t?.tags;
              if (tags && typeof tags === "object" && !Array.isArray(tags)) {
                const value = (tags as Record<string, unknown>)[tag];
                if (value !== undefined) {
                  uniqueTags.add(value);
                }
              }
            });
            return {
              group: tag,
              items: Array.from(uniqueTags).map((item) => ({
                label: item,
                value: `${tag}|-${item}`,
              })),
            };
          }) ?? [])
        : [];
    const chatFilters = [groupData, campaignsData, ...multiSelectTagsData];
    return chatFilters;
  } catch (error) {
    log.error({ err: error }, "Error in inbox chat filter get api");
    return null;
  }
}

export async function filterChats(
  orgId: string,
  page: number,
  bodyFilterProps: WaChatFilterSchema,
  userId: string,
  actor: Actor,
) {
  try {
    let teamIdsCache: string[] | null = null;
    const getTeamIdsLazy = async () => {
      if (!teamIdsCache) {
        teamIdsCache = await getTeamIdsByUserId(userId);
      }
      return teamIdsCache;
    };

    const params: unknown[] = [orgId, (page - 1) * 20, userId];
    let paramIndex = 4;
    const filters: string[] = [`c."orgId" = $1::uuid`];

    // Team channel scope. Applied here — above the search/non-search split and independent of
    // `bodyFilterProps.phone` — so that choosing "All", clearing the filter, or naming someone
    // else's channel cannot widen it. The user's own phone filter below ANDs on top of this.
    // Contact-grained, matching the phone filter: legacy messages carry a null conversationId,
    // so scoping by conversation would hide un-backfilled tickets outright.
    if (!actor.scope.all) {
      const scope = await getScopedSourceIdentifiers(actor);
      if (!scope.all) {
        if (scope.identifiers.length === 0) {
          // Scoped to zero channels: match nothing rather than falling through to no filter.
          filters.push(`1 = 0`);
        } else {
          // Every spelling of each channel (see `getScopedSourceIdentifiers`), so
          // the match covers rows written before identifiers were settled on
          // digits — and stays on the `sourceIdentifier` index, which an
          // expression match would not.
          params.push(scope.identifiers);
          filters.push(`EXISTS (
            SELECT 1 FROM "WaMessage" wm
            WHERE wm."contactId" = c.id
            AND wm."sourceIdentifier" = ANY($${paramIndex++}::TEXT[])
          )`);
        }
      }
    }

    /**
     * The Spam tab is the one **contact-grained** list: spam is a flag on the
     * contact, so it lists one row per spam contact rather than one per ticket.
     * The row still carries that contact's most recent ticket (see the FROM
     * clause below) so opening it lands on a real thread.
     */
    const spamMode = Boolean(bodyFilterProps?.spam);

    // Inbox Tickets v2: the list is conversation-grained — one row per ticket, not
    // per contact. Recency is therefore the conversation's own clock; `createdAt`
    // covers tickets that exist but have not been messaged in yet. In spam mode a
    // contact may have no ticket at all, hence the contact-level fallback.
    let orderBy = `COALESCE(conv."lastMessageAt", conv."createdAt", c."lastReceivedMessageTimeStamp")`;
    let allOrderBy = `fc."conversationLastMessageAt"`;
    let sortBy = "DESC";
    if (bodyFilterProps?.sortBy === "oldest") {
      sortBy = "ASC";
    } else if (bodyFilterProps?.sortBy === "newest_wa_created") {
      orderBy = `COALESCE(conv."lastCustomerMessageAt", conv."lastMessageAt", conv."createdAt", c."lastReceivedMessageTimeStamp")`;
      allOrderBy = `fc."conversationLastCustomerMessageAt"`;
    } else if (bodyFilterProps?.sortBy === "oldest_wa_created") {
      orderBy = `COALESCE(conv."lastCustomerMessageAt", conv."lastMessageAt", conv."createdAt", c."lastReceivedMessageTimeStamp")`;
      allOrderBy = `fc."conversationLastCustomerMessageAt"`;
      sortBy = "ASC";
    }

    const isSearchMode = (bodyFilterProps?.searchTerm?.length ?? 0) > 0;

    /**
     * Spam contacts are hidden from every other tab — that is what marking spam is
     * for — and the Spam tab shows only them. Blocked is the one exception: a
     * contact who is both still belongs in Blocked, or they would vanish entirely.
     */
    if (spamMode) {
      filters.push(`c."isSpam" = TRUE`);
    } else if (!bodyFilterProps?.blockedUsers) {
      filters.push(`c."isSpam" = FALSE`);
    }

    if (!isSearchMode && !spamMode) {
      if (bodyFilterProps?.waMessageAssignStatus === "UnAssigned") {
        filters.push(`(c."lastReceivedMessageTimeStamp" IS NOT NULL)`);
      }

      if ((bodyFilterProps?.labels?.length ?? 0) > 0) {
        params.push(bodyFilterProps.labels);
        filters.push(`EXISTS (
          SELECT 1 FROM "ContactLabelMap" clm 
          WHERE clm."contactId" = c.id 
          AND clm."labelId" = ANY($${paramIndex++}::uuid[])
        )`);
      }

      // Conversation tags are ticket-grained, so this matches on the row's own
      // conversation rather than on the contact the way labels above do.
      if ((bodyFilterProps?.conversationTags?.length ?? 0) > 0) {
        params.push(bodyFilterProps.conversationTags);
        filters.push(`EXISTS (
          SELECT 1 FROM "ConversationTagMap" ctm
          WHERE ctm."conversationId" = conv.id
          AND ctm."tagId" = ANY($${paramIndex++}::uuid[])
        )`);
      }

      if (bodyFilterProps?.lifecycle) {
        params.push(bodyFilterProps.lifecycle);
        filters.push(`c."lifecycleId" = $${paramIndex++}::uuid`);
      }

      // Inbox Tickets v2: favourite / @mention filters. Favourite is per-ticket.
      if (bodyFilterProps?.favorite) {
        filters.push(`conv."isFavorite" = TRUE`);
      }

      if (bodyFilterProps?.mentions) {
        // $3 is the current userId (see params init). Only unseen mentions for me.
        // Mentions are matched per-ticket now, but `conversationId` is nullable on
        // InboxMention (rows written before a note was threaded), so those fall back
        // to the contact and surface on every one of that contact's tickets.
        filters.push(`EXISTS (
          SELECT 1 FROM "InboxMention" m
          WHERE (
            m."conversationId" = conv.id
            OR (m."conversationId" IS NULL AND m."contactId" = c.id)
          )
          AND m."mentionedUserId" = $3::uuid
          AND m."clearedAt" IS NULL
        )`);
      }

      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: { waAssignedChatPermission: true },
      });
      const waAssignedChatPermission = org?.waAssignedChatPermission;

      const isAssignedToMe = bodyFilterProps?.waMessageAssignStatus === "mine";
      const isNew = bodyFilterProps?.waMessageAssignStatus === "New";
      const isNotSent = bodyFilterProps?.waMessageAssignStatus !== "Sent";

      /**
       * Assignment moved onto the conversation in v2 (`ConversationAssignedUserTeamMap`),
       * but every pre-v2 assignment was only ever written contact-grained to
       * `WaInboxAssign`. Both are checked, or historical tickets read as unassigned.
       * The same `$n` placeholder is reused across the two branches — one push, one
       * param, referenced twice.
       */
      const assignExists = (convConds: string[], contactConds: string[]) => {
        const convWhere = [
          `cam."conversationId" = conv.id`,
          `cam."lastRemovedAt" IS NULL`,
          ...convConds,
        ];
        const contactWhere = [`winb."contactId" = c.id`, ...contactConds];
        return `(
          EXISTS (SELECT 1 FROM "ConversationAssignedUserTeamMap" cam WHERE ${convWhere.join(" AND ")})
          OR EXISTS (SELECT 1 FROM "WaInboxAssign" winb WHERE ${contactWhere.join(" AND ")})
        )`;
      };

      /**
       * Set when every status this request asks for is a live one (Open, New,
       * Mine…). A conversation carrying a close stamp is a finished ticket
       * whatever its `status` column says, so those tabs also require the stamp
       * to be absent — without it a row left inconsistent by some other writer
       * shows up in Open right next to the successor ticket that replaced it.
       */
      let liveStatusesOnly = false;

      if (bodyFilterProps?.waMessageAssignStatus && isNotSent) {
        if (isNew) {
          liveStatusesOnly = true;
          params.push(WaMessageAssignStatus.UNASSIGNED);
          filters.push(
            `COALESCE(conv."lastMessageAt", conv."createdAt") > NOW() - INTERVAL '24 hours' AND conv."status"::TEXT = $${paramIndex++}::TEXT`,
          );
        } else {
          // FIX: Handle case mismatch (e.g. "Addressed" vs "ADDRESSED")
          const rawStatus = bodyFilterProps.waMessageAssignStatus;
          const assignedStatus = isWaMessageAssignStatusTabKey(rawStatus)
            ? WaMessageAssignStatusTab[rawStatus]
            : rawStatus.toUpperCase();

          if (assignedStatus === "ADDRESSED") {
            // A subset was picked in the filter panel (only SPAM, say), so match it
            // exactly; the unfiltered tab is "every closed ticket", which includes
            // anything carrying a close stamp — the mirror of the live-status rule
            // below, so a stamped row can never fall out of both tabs.
            const statusSubsetPicked = Boolean(bodyFilterProps.status?.length);
            params.push(statusSubsetPicked ? bodyFilterProps.status : WaMessageClosedStatus);
            const statusParam = paramIndex++;
            filters.push(
              statusSubsetPicked
                ? `conv."status"::TEXT = ANY($${statusParam}::TEXT[])`
                : `(conv."status"::TEXT = ANY($${statusParam}::TEXT[]) OR conv."closedAt" IS NOT NULL)`,
            );
          } else {
            params.push(assignedStatus);
            filters.push(`conv."status"::TEXT = $${paramIndex++}::TEXT`);
            liveStatusesOnly = !isTerminalInboxStatus(assignedStatus as InboxStatus);
          }

          if (isAssignedToMe) {
            params.push(userId);
            const userParam = paramIndex++;
            const convConds = [`cam."userId" = $${userParam}::uuid`];
            const contactConds = [`winb."assignedUserId" = $${userParam}::uuid`];

            if (bodyFilterProps?.assignedTeams?.length) {
              params.push(bodyFilterProps.assignedTeams);
              const teamParam = paramIndex++;
              convConds.push(`cam."teamId" = ANY($${teamParam}::uuid[])`);
              contactConds.push(`winb."teamId" = ANY($${teamParam}::uuid[])`);
            }

            filters.push(assignExists(convConds, contactConds));
          }
        }
      }
      if (!bodyFilterProps?.waMessageAssignStatus) {
        if (bodyFilterProps.status?.length) {
          params.push(bodyFilterProps.status);
          filters.push(`(conv."status"::TEXT = ANY($${paramIndex++}::TEXT[]))`);
          liveStatusesOnly = bodyFilterProps.status.every(
            (s) => !isTerminalInboxStatus(s as InboxStatus),
          );
        }
      }

      // --- CLEANED ASSIGNMENT FILTER LOGIC ---

      const wantsAssignedOnly =
        !bodyFilterProps?.waMessageAssignStatus && bodyFilterProps?.status?.includes("ASSIGNED");
      const hasTeamFilter = Boolean(bodyFilterProps?.assignedTeams?.length);
      const hasUserFilter = Boolean(bodyFilterProps?.assignedUserIds?.length && !isAssignedToMe);
      const isStrict = hasTeamFilter || hasUserFilter;

      // Only evaluate this block if specific teams/users are requested OR we are fetching general 'ASSIGNED' chats
      if (wantsAssignedOnly || isStrict) {
        const convConditions: string[] = [];
        const contactConditions: string[] = [];

        // Build team conditions
        if (hasTeamFilter) {
          params.push(bodyFilterProps.assignedTeams);
          const teamParam = paramIndex++;
          convConditions.push(`cam."teamId" = ANY($${teamParam}::uuid[])`);
          contactConditions.push(`winb."teamId" = ANY($${teamParam}::uuid[])`);
        } else if (waAssignedChatPermission === WaAssignedChatPermission.TeamMembers && !isStrict) {
          // If they are TeamMembers, and NO strict filters are applied, limit to their own teams implicitly
          const teamIds = await getTeamIdsLazy();
          params.push(teamIds);
          const teamParam = paramIndex++;
          convConditions.push(`cam."teamId" = ANY($${teamParam}::uuid[])`);
          contactConditions.push(`winb."teamId" = ANY($${teamParam}::uuid[])`);
        }

        // Build user conditions
        if (hasUserFilter) {
          if (actor.scope.inbox === "assigned_only") {
            if (bodyFilterProps.assignedUserIds?.includes(userId)) {
              params.push(userId);
              const userParam = paramIndex++;
              convConditions.push(`cam."userId" = $${userParam}::uuid`);
              contactConditions.push(`winb."assignedUserId" = $${userParam}::uuid`);
            }
          } else {
            params.push(bodyFilterProps.assignedUserIds);
            const userParam = paramIndex++;
            convConditions.push(`cam."userId" = ANY($${userParam}::uuid[])`);
            contactConditions.push(`winb."assignedUserId" = ANY($${userParam}::uuid[])`);
          }
        }

        const existsQuery = assignExists(convConditions, contactConditions);

        if (isStrict) {
          filters.push(existsQuery);
        } else {
          filters.push(`(conv."status" != 'ASSIGNED' OR ${existsQuery})`);
        }
      }

      // Phone filter
      // if (bodyFilterProps?.phone && bodyFilterProps.phone !== "all") {
      //   params.push(bodyFilterProps.phone);
      //   params.push(`+${bodyFilterProps.phone}`);
      //   filters.push(
      //     `(c."lastMessageSourceIdentifier" = $${paramIndex++} OR c."lastMessageSourceIdentifier" = $${paramIndex++})`,
      //   );
      // }
      if (bodyFilterProps?.phone && bodyFilterProps.phone !== "all") {
        // All of the channel's spellings, not the bare and `+`-prefixed pair this
        // used to list — the column holds at least four, so picking a channel hid
        // every ticket whose messages happened to be stored with the separators
        // Meta formats the number with.
        params.push(channelIdentifierSpellings(bodyFilterProps.phone));
        filters.push(`EXISTS (
          SELECT 1 FROM "WaMessage" wm
          WHERE wm."contactId" = c.id
          AND wm."sourceIdentifier" = ANY($${paramIndex++}::TEXT[])
        )`);
      }

      if (liveStatusesOnly) {
        filters.push(`conv."closedAt" IS NULL`);
      }

      filters.push(`c."blockedOnWhatsApp" = ${bodyFilterProps?.blockedUsers ? "TRUE" : "FALSE"}`);
    }

    if (isSearchMode && bodyFilterProps.searchTerm) {
      params.push(`%${bodyFilterProps.searchTerm}%`);
      params.push(`%${bodyFilterProps.searchTerm.replace(/\s+/g, "")}%`);
      filters.push(
        `(c."name" ILIKE $${paramIndex}::TEXT OR REPLACE(c."phone", ' ', '') LIKE $${paramIndex + 1}::TEXT)`,
      );
      paramIndex += 2;
    }

    const whereClause = filters.join(" AND ");

    const query = `
      WITH filtered_conversations AS (
        SELECT
          conv."id"                AS "conversationId",
          conv."number"            AS "ticketNumber",
          conv."subject"           AS "ticketSubject",
          conv."description"       AS "ticketDescription",
          conv."resolutionResult"  AS "resolutionResult",
          conv."status"            AS "conversationStatus",
          -- Row freshness for the client's cache: it keeps rows in IndexedDB and
          -- only replaces one when the response is newer, so a row without this
          -- was cached forever and a ticket closed since first load kept its old
          -- status client-side. Contact has no updatedAt column; the ticket's own
          -- is what changes when it moves.
          --
          -- Who holds the thread under Meta AI thread control lives on the contact,
          -- so its change time counts too, or a handover never refreshed the row.
          GREATEST(COALESCE(conv."updatedAt", conv."createdAt"), c."metaAgentThreadOwnerAt") AS "updatedAt",
          conv."createdAt"         AS "ticketCreatedAt",
          conv."closedAt"          AS "ticketClosedAt",
          conv."reopenCount"       AS "ticketReopenCount",
          COALESCE(conv."lastMessageAt", conv."createdAt", c."lastReceivedMessageTimeStamp")         AS "conversationLastMessageAt",
          -- Same expression as the customer-message ORDER BY above, so the page is ordered
          -- the way it was picked; a ticket the customer never wrote in falls back to activity.
          COALESCE(conv."lastCustomerMessageAt", conv."lastMessageAt", conv."createdAt", c."lastReceivedMessageTimeStamp") AS "conversationLastCustomerMessageAt",
          c.id,
          c."name",
          c."phone",
          c."other",
          c."waMessageAssignStatus",
          c."lastReceivedMessageTimeStamp",
          c."consent",
          c."whatsappUserName",
          c."blockedOnWhatsApp",
          c."isSpam",
          c."spamMarkedAt",
          c."metaAgentThreadOwner",
          c."metaAgentThreadOwnerAt",
          c."metaAgentHandoverReason",
          -- Whether Meta AI has been part of this customer's conversation — its
          -- replies are stored with Meta's originator=bizai tag — on a number
          -- that still has the agent. Lets the inbox offer a hand-back before any
          -- handover has been seen, without offering one on every chat of that number.
          (
            EXISTS (
              SELECT 1
              FROM "MetaBusinessAgent" mba
              JOIN "WhatsappSettings" mws ON mws.id = mba."whatsappSettingsId"
              WHERE mba."orgId" = c."orgId"
                AND mba.status = 'ONBOARDED'
                AND (
                  c."lastReceivedMetadata"->>'phone_number_id' IS NULL
                  OR mws."phoneId" = c."lastReceivedMetadata"->>'phone_number_id'
                )
            )
            AND EXISTS (
              SELECT 1
              FROM "WaMessage" aiw
              WHERE aiw."contactId" = c.id
                AND aiw."messageBody"->'send'->>'biz_opaque_callback_data' LIKE '%"originator":"bizai"%'
            )
          ) AS "metaAgentInvolved",
          conv."isFavorite",
          c."source",
          c."igsId",
          c."psid",
          c."profilePic",
          c."followerCount",
          c."isIgVerifiedUser",
          c."lifecycleId",
          c."closedAt",
          json_build_object('id', conv."closedBy", 'name', cu.name)  AS "closedUser",
          COALESCE(c.tags, '{}'::jsonb) as tags,
         (
          SELECT COUNT(*)::INTEGER
          FROM "WaMessage" w
          WHERE w."conversationId" = conv.id
          AND w."messageBody"->>'exchangeProcess' = 'receive'
          AND NOT($3::TEXT = ANY(w."readUsers"))
        ) as "unReadMessageCount",
          -- Fallback preview for environments where historical messages were never
          -- linked to a conversation. Only safe to use when the contact has a single
          -- ticket; otherwise it would show a newer ticket's message on an old one.
          c."lastMessageBody"             AS "contactLastMessageBody",
          c."lastMessageWaCreatedAt"      AS "contactLastMessageWaCreatedAt",
          c."lastMessagePlatform"         AS "contactLastMessagePlatform",
          c."lastMessageSourceIdentifier" AS "contactLastMessageSourceIdentifier",
          c."lastReceivedMetadata"
        ${
          spamMode
            ? // Contact-grained: one row per spam contact, carrying their most recent
              // ticket (LEFT, so a contact with no ticket at all still lists — the row
              // then keys on the contact id client-side).
              `FROM "Contact" c
        LEFT JOIN LATERAL (
          SELECT cv.*
          FROM "Conversation" cv
          WHERE cv."contactId" = c.id
          ORDER BY COALESCE(cv."lastMessageAt", cv."createdAt") DESC
          LIMIT 1
        ) conv ON TRUE`
            : isSearchMode
              ? // One row per ticket as usual, plus a ticketless row for a contact who has
                // never had a conversation, so search finds every contact.
                `FROM "Contact" c
        LEFT JOIN "Conversation" conv ON conv."contactId" = c.id`
              : `FROM "Conversation" conv
        INNER JOIN "Contact" c ON c.id = conv."contactId"`
        }
        LEFT JOIN "User" cu ON cu.id = conv."closedBy"
        WHERE ${whereClause}
        ORDER BY ${orderBy} ${sortBy} NULLS LAST
        LIMIT 20 OFFSET $2
      ),
      assigned_users AS (
        SELECT
          a."conversationId",
          json_agg(
            json_build_object('id', a."userId", 'teamId', a."teamId", 'name', a."name")
          ) as users
        FROM (
          -- v2 assignment: per conversation.
          SELECT cam."conversationId", u.id AS "userId", cam."teamId", u.name
          FROM "ConversationAssignedUserTeamMap" cam
          INNER JOIN "User" u ON u.id = cam."userId"
          WHERE cam."conversationId" IN (SELECT "conversationId" FROM filtered_conversations)
            AND cam."lastRemovedAt" IS NULL
          UNION
          -- Legacy assignment: per contact, projected onto that contact's tickets.
          SELECT fc."conversationId", u.id AS "userId", winb."teamId", u.name
          FROM filtered_conversations fc
          INNER JOIN "WaInboxAssign" winb ON winb."contactId" = fc.id
          INNER JOIN "User" u ON u.id = winb."assignedUserId"
        ) a
        GROUP BY a."conversationId"
      ),
      contact_labels AS (
        SELECT
          clm."contactId",
          json_agg(
            json_build_object('id', cl.id, 'name', cl.name, 'color', cl.color)
          ) as labels
        FROM "ContactLabelMap" clm
        INNER JOIN "ContactLabel" cl ON clm."labelId" = cl.id
        WHERE clm."contactId" IN (SELECT id FROM filtered_conversations)
        GROUP BY clm."contactId"
      ),
      conversation_tags AS (
        SELECT
          ctm."conversationId",
          json_agg(
            json_build_object('id', ct.id, 'name', ct.name, 'color', ct.color)
            ORDER BY ct."createdAt"
          ) as tags
        FROM "ConversationTagMap" ctm
        INNER JOIN "ConversationTag" ct ON ctm."tagId" = ct.id
        WHERE ctm."conversationId" IN (SELECT "conversationId" FROM filtered_conversations)
        GROUP BY ctm."conversationId"
      ),
      conversation_last_message AS (
        SELECT DISTINCT ON (w."conversationId")
          w."conversationId",
          w."messageBody"       AS "lastMessageBody",
          w."waCreatedAt"       AS "lastMessageWaCreatedAt",
          w."sourcePlatform"    AS "lastMessagePlatform",
          w."sourceIdentifier"  AS "lastMessageSourceIdentifier",
          w."deletedAt"         AS "lastMessageDeletedAt"
        FROM "WaMessage" w
        WHERE w."conversationId" IN (SELECT "conversationId" FROM filtered_conversations)
        ORDER BY w."conversationId", w."waCreatedAt" DESC
      ),
      conversation_mentions AS (
        SELECT
          fc."conversationId",
          COUNT(*)::INTEGER as "mentionCount"
        FROM filtered_conversations fc
        INNER JOIN "InboxMention" m
          ON (
            m."conversationId" = fc."conversationId"
            OR (m."conversationId" IS NULL AND m."contactId" = fc.id)
          )
        WHERE m."mentionedUserId" = $3::uuid
          AND m."clearedAt" IS NULL
        GROUP BY fc."conversationId"
      ),
      -- Sibling ticket count, so the thread can offer its history strip without a
      -- second round trip. Excludes the row's own ticket.
      contact_ticket_counts AS (
        SELECT fc."conversationId", COUNT(sib.*)::INTEGER AS "otherTicketCount"
        FROM filtered_conversations fc
        LEFT JOIN "Conversation" sib
          ON sib."contactId" = fc.id AND sib.id <> fc."conversationId"
        GROUP BY fc."conversationId"
      ),
      -- The board column the contact's lead sits in — what the row's chip shows
      -- now that pipeline stages have replaced the lifecycle. Keyed off the
      -- twenty rows already chosen rather than joined into
      -- \`filtered_conversations\`, so it never runs over the whole filtered set.
      --
      -- Only the Leads board, the one \`getContactStage\` reports; a contact has at
      -- most one lead there, so DISTINCT ON is a guard rather than a choice.
      contact_lead_stages AS (
        SELECT DISTINCT ON (lead."contactId")
          lead."contactId",
          ps."name"  AS "stageName",
          ps."color" AS "stageColor"
        FROM "Lead" lead
        INNER JOIN "PipelineStage" ps ON ps.id = lead."stageId"
        INNER JOIN "Pipeline" p ON p.id = lead."pipelineId" AND p."type" = 'LEADS'
        WHERE lead."contactId" IN (SELECT id FROM filtered_conversations)
        ORDER BY lead."contactId", lead."createdAt" ASC
      )
      SELECT
        fc.*,
        COALESCE(au.users, '[]'::json) as "assignedUsers",
        COALESCE(cls.labels, '[]'::json) as "contactLabels",
        COALESCE(cvt.tags, '[]'::json) as "conversationTags",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessageBody"
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessageBody"
        END AS "lastMessageBody",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessageWaCreatedAt"
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessageWaCreatedAt"
        END AS "lastMessageWaCreatedAt",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessagePlatform"::TEXT
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessagePlatform"::TEXT
        END AS "lastMessagePlatform",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessageSourceIdentifier"
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessageSourceIdentifier"
        END AS "lastMessageSourceIdentifier",
        -- Only the ticket-scoped branch can say this: the contact-level fallback
        -- is a denormalized copy of the body with no row behind it to flag.
        clm."lastMessageDeletedAt" AS "lastMessageDeletedAt",
        COALESCE(cm."mentionCount", 0) as "mentionCount",
        COALESCE(ctc."otherTicketCount", 0) as "otherTicketCount",
        l."name" as "lifecycleName",
        cst."stageName",
        cst."stageColor"
      FROM filtered_conversations fc
      LEFT JOIN assigned_users au ON au."conversationId" = fc."conversationId"
      LEFT JOIN contact_labels cls ON cls."contactId" = fc.id
      LEFT JOIN conversation_tags cvt ON cvt."conversationId" = fc."conversationId"
      LEFT JOIN conversation_last_message clm ON clm."conversationId" = fc."conversationId"
      LEFT JOIN conversation_mentions cm ON cm."conversationId" = fc."conversationId"
      LEFT JOIN contact_ticket_counts ctc ON ctc."conversationId" = fc."conversationId"
      LEFT JOIN "Lifecycle" l ON l.id = fc."lifecycleId"
      LEFT JOIN contact_lead_stages cst ON cst."contactId" = fc.id
      ORDER BY ${allOrderBy} ${sortBy} NULLS LAST;
    `;

    const conversations = await prisma.$queryRawUnsafe<InboxConversationRow[]>(query, ...params);
    if (conversations.length === 0) return [];

    const conversationIds = conversations.map((row) => row.conversationId);

    const messagesRows = await prisma.$queryRaw<InboxMessageRow[]>`
      WITH ranked AS (
        SELECT
          w.id,
          w."contactId",
          w."conversationId",
          w."waCreatedAt",
          w."messageBody",
          w."sourcePlatform",
          w."sourceIdentifier",
          w."sendBy",
          w."stats",
          w."messageId",
          w."templateComponentParams",
          -- Seeds the thread on first paint, so it has to carry the revoked flag
          -- too — otherwise a deleted message shows its original text until the
          -- per-contact fetch replaces these rows.
          w."deletedAt",
          ROW_NUMBER() OVER (PARTITION BY w."conversationId" ORDER BY w."waCreatedAt" DESC) AS rn
        FROM "WaMessage" w
        WHERE w."conversationId" = ANY(${conversationIds}::uuid[])
      )
      SELECT
        r.*,
        u."name" AS "senderName",
        u."profilePhoto" AS "senderProfilePhoto"
      FROM ranked r
      LEFT JOIN "User" u ON r."sendBy" = u.id
      WHERE r.rn <= 10
      ORDER BY r."conversationId", r."waCreatedAt" DESC
    `;

    const messagesByConversation = new Map<string, InboxThreadMessage[]>();
    for (const row of messagesRows) {
      const list = messagesByConversation.get(row.conversationId) || [];
      list.push({
        id: row.id,
        contactId: row.contactId,
        conversationId: row.conversationId,
        waCreatedAt: row.waCreatedAt,
        messageBody: row.messageBody,
        sourcePlatform: row.sourcePlatform,
        sourceIdentifier: row.sourceIdentifier,
        sendBy: row.sendBy,
        sender:
          row.senderName || row.senderProfilePhoto
            ? { name: row.senderName, profilePhoto: row.senderProfilePhoto }
            : null,
        stats: row.stats,
        messageId: row.messageId,
        templateComponentParams: row.templateComponentParams,
        deletedAt: row.deletedAt,
      });
      messagesByConversation.set(row.conversationId, list);
    }

    // Notes as far back as each ticket's seed reaches; the full thread fetch brings the rest.
    const SEED_SIZE = 10;
    const seedNotes = await prisma.inboxNote.findMany({
      where: {
        orgId,
        OR: conversationIds.map((id) => {
          const seed = messagesByConversation.get(id) ?? [];
          const oldest = seed.length === SEED_SIZE ? seed.at(-1)?.waCreatedAt : null;
          return { conversationId: id, ...(oldest && { createdAt: { gte: oldest } }) };
        }),
      },
      include: noteInclude,
      orderBy: { createdAt: "desc" },
    });
    const notesByConversation = Map.groupBy(
      seedNotes.map(noteToThreadItem),
      (n) => n.conversationId,
    );

    return conversations.map((row) => ({
      ...row,
      lastMessage: row.lastMessageBody
        ? {
            messageBody: row.lastMessageBody,
            waCreatedAt: row.lastMessageWaCreatedAt,
            sourcePlatform: row.lastMessagePlatform,
            sourceIdentifier: row.lastMessageSourceIdentifier,
            deletedAt: row.lastMessageDeletedAt,
          }
        : null,
      metadata: row.lastReceivedMetadata,
      messages: interleave(
        messagesByConversation.get(row.conversationId) || [],
        notesByConversation.get(row.conversationId) ?? [],
        (message) => message.waCreatedAt,
      ),
    }));
  } catch (error) {
    // If Postgres threw a parameter bounds error earlier, it was swallowed here.
    log.error({ err: error }, "Error in inbox chat filter API");
    return [];
  }
}

export async function getMediaFile(mediaId: string, orgId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org ${orgId}`);
  }
  const fileUrl = await callMetaApi(`/${mediaId}`, "GET", waSettings.accessToken);
  if (fileUrl?.data) {
    // Step 2: Convert the downloaded media to a Buffer (for binary data)
    const fileResponse = await axios.get(fileUrl?.data.url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${waSettings.accessToken}`,
      },
    });
    // const imageBuffer = Buffer.from(fileResponse.data, "binary");
    return {
      type: fileResponse?.headers?.["content-type"],
      data: fileResponse.data,
    };
  } else {
    log.error("Failed to download media file from WhatsApp API.");
  }
}

export async function exportWhatsapChats(
  orgId: string,
  constraints: WaChatExportConstraints,
  bodyFilterProps: WaChatFilterSchema,
  limit?: number,
  offset?: number,
): Promise<
  Array<{
    date: string;
    from: string;
    name: string;
    receivebody: string;
    sendbody: string;
    templatename: string;
  }>
> {
  // $1 is the org id. The dates are user input, so they are always bound as
  // parameters and never written into the SQL text.
  const params: string[] = [orgId];
  const bind = (value: string) => {
    params.push(value);
    return `$${params.length}`;
  };

  function extendedWhereClause(): string {
    let extendedWhereClause = "";

    // Handling date constraints
    if (constraints?.date) {
      switch (constraints.date.type) {
        case DateType.BETWEEN:
          extendedWhereClause += `
          AND wm."createdAt" >= ${bind(constraints.date.between.from)}::date
          AND wm."createdAt" < ${bind(
            dayjs(constraints.date.between.to).add(1, "day").format("YYYY-MM-DD"),
          )}::date
          `;
          break;
        case DateType.BEFORE:
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') ${constraints.date.inclusive ? "<=" : "<"} ${bind(constraints.date.before)} `;
          break;
        case DateType.AFTER:
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') ${constraints.date.inclusive ? ">=" : ">"} ${bind(constraints.date.after)} `;
          break;
        case DateType.ON:
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') = ${bind(constraints.date.on)} `;
          break;
      }
    }

    // Handling repliesOnly constraint
    if (constraints?.repliesOnly) {
      extendedWhereClause += `AND wm."messageBody"->>'exchangeProcess' = 'receive' `;
    }

    return extendedWhereClause.trim();
  }
  const query = `
    SELECT
      wm."createdAt" AS date,
      c."phone" AS "from",
      c."name" AS "name",
      -- A revoked message keeps its row here as it does in the thread, but its
      -- content is withheld: the customer deleted it, so an export must not hand
      -- it back out. The stored body is untouched.
      CASE
        WHEN wm."deletedAt" IS NOT NULL THEN
          CASE WHEN wm."messageBody"->>'exchangeProcess' = 'receive'
            THEN '${DELETED_MESSAGE_PLACEHOLDER}' END
        ELSE COALESCE(
          wm."messageBody"->'receive'->'messages'->0->'text'->>'body',
          wm."messageBody"->'receive'->'messages'->0->'button'->>'text'
        )
      END AS receivebody,
      CASE
        WHEN wm."deletedAt" IS NOT NULL THEN
          CASE WHEN wm."messageBody"->>'exchangeProcess' = 'send'
            THEN '${DELETED_MESSAGE_PLACEHOLDER}' END
        ELSE wm."messageBody"->'send'->'text'->>'body'
      END AS sendbody,
      CASE WHEN wm."deletedAt" IS NOT NULL THEN NULL
        ELSE wm."messageBody"->'send'->'template'->>'name'
      END AS templatename
    FROM 
      "WaMessage" wm 
    JOIN 
      "Contact" c ON wm."contactId" = c.id
    WHERE
      c."orgId" = $1::uuid ${extendedWhereClause()}
    ORDER BY
      wm."createdAt" ASC
    ${limit != null ? `LIMIT ${Number(limit)} OFFSET ${Number(offset ?? 0)}` : ""}`;

  const result = await prisma.$queryRawUnsafe(query, ...params);
  return result as Array<{
    date: string;
    from: string;
    name: string;
    receivebody: string;
    sendbody: string;
    templatename: string;
  }>;
}

export async function assignWaMessageToUser(
  data: WaMessageAssignBody,
  orgId: string,
  userId?: string,
) {
  try {
    const existingUsers = await prisma.waInboxAssign.findMany({
      where: {
        contactId: data.contactId,
      },
    });
    const assignIfOnline = data.assignIfOnline ?? false;
    const newUsers: { userId: string; teamId: string }[] = [];
    const existingUserIds = existingUsers.map((u) => u.assignedUserId);

    const incomingUserIds = data.assignees.map((a) => a.userId);

    const addedUsers = data.assignees.filter((a) => !existingUserIds.includes(a.userId));

    let revokedUsers: { assignedUserId: string; teamId: string }[] = existingUsers.filter(
      (u) => !incomingUserIds.includes(u.assignedUserId),
    );

    const isReassignment = revokedUsers.length > 0 && addedUsers.length > 0;

    for (const assignee of data.assignees) {
      let updateCount = false;
      const existingUser =
        existingUsers?.length > 0
          ? existingUsers.find((user) => user.assignedUserId === assignee.userId)
          : false;
      if (!existingUser) {
        if (assignIfOnline) {
          const user = await prisma.orgMember.findUnique({
            where: {
              userId_orgId: {
                userId: assignee.userId,
                orgId,
              },
            },
          });
          if (
            [UserAvailabilityStatus.busy, UserAvailabilityStatus.online].includes(
              user?.status as UserAvailabilityStatus,
            )
          ) {
            newUsers.push(assignee);
            updateCount = true;
          } else {
            throw new HttpError(`User is offline and cannot be assigned`, 400);
          }
        } else {
          newUsers.push(assignee);
          updateCount = true;
        }
      } else if (existingUser.teamId !== assignee.teamId) {
        await prisma.waInboxAssign.update({
          where: {
            contact_id_assigned_user_id_unique: {
              contactId: data.contactId,
              assignedUserId: existingUser.assignedUserId,
            },
          },
          data: {
            teamId: assignee.teamId,
          },
        });
      }
      if (updateCount)
        await prisma.userAssignedCount.upsert({
          where: {
            user_org_unique: {
              userId: assignee.userId,
              orgId,
            },
          },
          update: {
            assignCount: {
              increment: 1,
            },
          },
          create: {
            userId: assignee.userId,
            orgId,
            assignCount: 1,
          },
        });
    }

    await prisma.waInboxAssign.createMany({
      data: newUsers.map((user) => ({
        contactId: data.contactId,
        assignedUserId: user.userId,
        teamId: user.teamId,
      })),
      skipDuplicates: true,
    });

    // Assigning a contact whose last conversation is already closed starts a fresh
    // engagement. Open a new conversation (mirroring the inbound-message reopen path)
    // instead of resurrecting the finished one, so the closed record's closedAt /
    // resolution-time metrics stay frozen and the reopen counter advances. It is
    // opened before the events below so they are written to it, not the closed one.
    // A named ticket that is still open is the one assigned. A closed one is not
    // revived, so it falls through to the newest ticket, or a successor.
    const named = data.conversationId
      ? await prisma.conversation.findFirst({
          where: { id: data.conversationId, contactId: data.contactId },
        })
      : null;
    // An empty list unassigns: there is nothing to start, so no successor is opened.
    const isUnassign = data.assignees.length === 0;
    let conversation =
      named && (isUnassign || !isTerminalInboxStatus(named.status))
        ? named
        : await getLastCreatedConversationForContact(data.contactId);
    // Closing already revoked everyone; unassigning a closed ticket would only flip
    // the contact back into the live inbox.
    if (isUnassign && conversation && isTerminalInboxStatus(conversation.status)) {
      throw new HttpError("This ticket is closed", 409);
    }
    // The contact-level rows and status mirror the newest ticket, so unassigning an
    // older one clears that ticket alone and leaves whoever owns the newest in place.
    const newest =
      isUnassign && conversation
        ? await getLastCreatedConversationForContact(data.contactId)
        : null;
    const olderTicket = Boolean(conversation && newest && newest.id !== conversation.id);
    if (olderTicket && conversation) {
      const onTicket = await prisma.conversationAssignedUserTeamMap.findMany({
        where: { conversationId: conversation.id, lastRemovedAt: null },
        select: { userId: true, teamId: true },
      });
      revokedUsers = onTicket.map((row) => ({ assignedUserId: row.userId, teamId: row.teamId }));
    }
    if (!isUnassign && (!conversation || isTerminalInboxStatus(conversation.status))) {
      conversation = await openConversationForContact(
        data.contactId,
        orgId,
        WaMessageAssignStatus.ASSIGNED,
      );
    }

    if (isReassignment) {
      await createInternalWaMessage({
        contactId: data.contactId,
        conversationId: conversation?.id,
        waMessageAssignStatus: "REASSIGNED",
        assignedUsers: {
          removed: revokedUsers.map((u) => ({
            userId: u.assignedUserId,
            teamId: u.teamId,
          })),
          added: addedUsers.map((u) => ({
            userId: u.userId,
            teamId: u.teamId,
          })),
        },
        trigerredByUser: userId ?? "RateUp",
        messageId: data.messageId ?? crypto.randomUUID(),
      });
    } else {
      if (newUsers.length) {
        await createInternalWaMessage({
          contactId: data.contactId,
          conversationId: conversation?.id,
          waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
          assignedUsers: newUsers,
          trigerredByUser: userId ?? "RateUp",
          messageId: data.messageId ?? crypto.randomUUID(),
        });
      }

      if (revokedUsers.length) {
        await createInternalWaMessage({
          contactId: data.contactId,
          conversationId: conversation?.id,
          waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
          assignedUsers: revokedUsers.map((u) => ({
            userId: u.assignedUserId,
            teamId: u.teamId,
          })),
          trigerredByUser: userId ?? "RateUp",
          messageId: data.messageId ?? crypto.randomUUID(),
        });
      }
    }

    if (!olderTicket) {
      await prisma.waInboxAssign.deleteMany({
        where: {
          contactId: data.contactId,
          assignedUserId: {
            notIn: data.assignees.map((assignee) => assignee.userId),
          },
        },
      });
    }

    let updatedContact;
    if (olderTicket && conversation) {
      const ticketId = conversation.id;
      await updateConversationAssignees(ticketId, { assignees: [] }, userId);
      await prisma.$transaction((tx) =>
        mirrorConversationStatusTx(
          tx,
          data.contactId,
          WaMessageAssignStatus.UNASSIGNED,
          { source: userId ? "user" : "system", userId },
          { conversationId: ticketId },
        ),
      );
      updatedContact = await prisma.contact.findUniqueOrThrow({ where: { id: data.contactId } });
    } else if (isUnassign) {
      if (conversation) {
        await updateConversationAssignees(conversation.id, { assignees: [] }, userId);
      }
      const { contact } = await setInboxStatus(
        data.contactId,
        WaMessageAssignStatus.UNASSIGNED,
        { source: userId ? "user" : "system", userId },
        { conversationId: conversation?.id },
      );
      updatedContact = contact;
    } else {
      if (!conversation) throw new HttpError("No ticket to assign", 500);
      updatedContact = await updateContactById(data.contactId, orgId, {
        waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
        conversationId: conversation.id,
      });
      const updatedAssignees = [
        ...newUsers,
        ...data.assignees.filter(
          (t) => !newUsers.find((n) => n.userId === t.userId && n.teamId === t.teamId),
        ),
      ];
      await updateConversationAssignees(conversation.id, { assignees: updatedAssignees }, userId);
    }

    const contactRef = {
      contactId: updatedContact.id,
      contactName: updatedContact.name ?? "",
    };
    await notify({
      event: "inbox.assigned",
      orgId: updatedContact.orgId,
      audience: { kind: "users", userIds: newUsers.map((u) => u.userId) },
      data: contactRef,
      actorUserId: userId,
    });
    await notify({
      event: "inbox.unassigned",
      orgId: updatedContact.orgId,
      audience: { kind: "users", userIds: revokedUsers.map((u) => u.assignedUserId) },
      data: contactRef,
      actorUserId: userId,
    });

    //Change zapier schema
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_ASSIGN,
      {
        [ZapierTriggers.CONTACT_ASSIGN]: {
          contact: updatedContact,
          newAssignees: newUsers,
        },
      },
      orgId,
    );
    // The ticket is part of the result: assigning a contact whose last ticket was
    // closed opens a successor above, and the caller has no other way to learn
    // which ticket the assignment actually landed on.
    return {
      assignees: data.assignees,
      conversation: conversation
        ? { id: conversation.id, number: conversation.number, status: conversation.status }
        : null,
    };
  } catch (e) {
    if (e) {
      throw e;
    } else {
      throw new HttpError(`Internal error`, 500);
    }
  }
}

/**
 * Reopen a closed ticket, carrying its assignees over to the ticket that takes
 * its place.
 *
 * A closed ticket is a finished record — it is never revived — so reopening is
 * "start the next ticket where this one left off": the people who were on it
 * when it closed are assigned to the successor. Closing revokes assignees, so
 * the removed rows are the history to read when nothing is still active.
 *
 * Assignment is what opens the successor (see `assignWaMessageToUser`), so the
 * two paths stay identical; a ticket that never had anyone on it reopens
 * unassigned.
 */
export async function reopenConversation(
  orgId: string,
  userId: string,
  contactId: string,
  conversationId?: string | null,
  messageId?: string,
) {
  const conversation = conversationId
    ? await getConversationById(conversationId, orgId)
    : await getLastCreatedConversationForContact(contactId);

  const assignmentHistory = conversation
    ? await prisma.conversationAssignedUserTeamMap.findMany({
        where: { conversationId: conversation.id },
        orderBy: [{ lastRemovedAt: "desc" }, { lastAssignedAt: "desc" }],
      })
    : [];
  const stillAssigned = assignmentHistory.filter((row) => !row.lastRemovedAt);
  const previousAssignees = (stillAssigned.length ? stillAssigned : assignmentHistory).map(
    (row) => ({ userId: row.userId, teamId: row.teamId }),
  );

  if (previousAssignees.length) {
    return await assignWaMessageToUser(
      { contactId, assignees: previousAssignees, messageId },
      orgId,
      userId,
    );
  }

  // Nobody to carry over: open the successor unassigned and put the contact back
  // in the live inbox, which is what `setInboxStatus` does for a non-terminal
  // status (it leaves the closed ticket itself alone, by design).
  const successor =
    conversation && !isTerminalInboxStatus(conversation.status)
      ? conversation
      : await openConversationForContact(contactId, orgId, WaMessageAssignStatus.UNASSIGNED);
  await setInboxStatus(contactId, WaMessageAssignStatus.UNASSIGNED, { source: "user", userId });
  return {
    assignees: [],
    conversation: successor
      ? { id: successor.id, number: successor.number, status: successor.status }
      : null,
  };
}

export async function getAssignedUserForContact(contactId: string) {
  return await prisma.waInboxAssign.findMany({
    where: {
      contactId,
    },
    include: {
      assignedUser: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getAssignedUsersCountForContactByTeam(contactId: string, teamId: string) {
  return await prisma.waInboxAssign.count({
    where: {
      contactId,
      teamId,
    },
  });
}

export async function deleteAssignedUsersforContact(contactId: string) {
  return await prisma.waInboxAssign.deleteMany({
    where: {
      contactId,
    },
  });
}
export async function getContactsCountByInbox(orgId: string, userId: string, actor: Actor) {
  const teamIds = await getTeamIdsByUserId(userId);
  const stats = await getInboxCountsFromConversations(orgId);
  const count: {
    new_assigned_count: number;
    new_unassigned_count: number;
  }[] = await prisma.$queryRaw`WITH message_flags AS (
    SELECT
      conv.id AS conversation_id,
      conv."status" AS "waMessageAssignStatus",
      (
        EXISTS (
          SELECT 1 FROM "ConversationAssignedUserTeamMap" cam
          WHERE cam."conversationId" = conv.id
          AND cam."lastRemovedAt" IS NULL
          AND cam."teamId" = ANY(${teamIds}::uuid[])
          LIMIT 1
        )
        OR EXISTS (
          SELECT 1 FROM "WaInboxAssign" wa
          WHERE wa."contactId" = c.id
          AND wa."teamId" = ANY(${teamIds}::uuid[])
          LIMIT 1
        )
      ) AS is_assigned_to_my_team
    FROM "Conversation" conv
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE c."orgId" = ${orgId}::uuid
      AND NOT c."blockedOnWhatsApp"
      AND NOT c."isSpam"
      AND conv."closedAt" IS NULL
      AND COALESCE(conv."lastMessageAt", conv."createdAt") > NOW() - INTERVAL '24 hours'
  ), orgDetails AS (
    SELECT o."waAssignedChatPermission" AS permission FROM "Org" o WHERE o."id" = ${orgId}::uuid
  )
  SELECT
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus"::TEXT = ${WaMessageAssignStatus.ASSIGNED} AND (
      CASE 
        WHEN orgDetails.permission = ${WaAssignedChatPermission.All} THEN 1
        WHEN orgDetails.permission = ${WaAssignedChatPermission.Admins} THEN ${actor.scope.inbox === "assigned_only" ? 0 : 1}
        WHEN orgDetails.permission = ${WaAssignedChatPermission.TeamMembers} THEN is_assigned_to_my_team::int
      END 
    ) = 1)::INTEGER AS new_assigned_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus"::TEXT = ${WaMessageAssignStatus.UNASSIGNED})::INTEGER AS new_unassigned_count
  FROM message_flags mf CROSS JOIN orgDetails;`;

  // Ticket counts per team, from the conversation-grained assignment map with the
  // legacy contact-grained one folded in. Now org-scoped — the previous version
  // grouped over all of WaInboxAssign and leaked other orgs' counts.
  const assignedTeamWiseCount = await prisma.$queryRaw`
  SELECT
    a."teamId",
    COUNT(DISTINCT a."conversationId")::INTEGER AS "assignedCount"
  FROM (
    SELECT cam."teamId", cam."conversationId"
    FROM "ConversationAssignedUserTeamMap" cam
    INNER JOIN "Conversation" conv ON conv.id = cam."conversationId"
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE c."orgId" = ${orgId}::uuid AND cam."lastRemovedAt" IS NULL
    UNION
    SELECT winb."teamId", conv.id AS "conversationId"
    FROM "WaInboxAssign" winb
    INNER JOIN "Conversation" conv ON conv."contactId" = winb."contactId"
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE c."orgId" = ${orgId}::uuid
  ) a
  GROUP BY a."teamId";
  `;

  // Inbox Tickets v2: favourite + @mention nav counts, ticket-grained to match the list.
  const favouriteCount = await prisma.conversation.count({
    where: { isFavorite: true, contact: { orgId, blockedOnWhatsApp: false, isSpam: false } },
  });

  /**
   * "Mine" = the Assigned tickets this user is on, matching the list's `mine`
   * filter: status ASSIGNED plus an assignment row for the user. Assignment is
   * conversation-grained in v2 but was contact-grained before it, so both maps
   * are checked — see `filterChats`.
   */
  const mineCount: { count: number }[] = await prisma.$queryRaw`
    SELECT COUNT(*)::INTEGER AS count
    FROM "Conversation" conv
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE conv."orgId" = ${orgId}::uuid
      AND NOT c."blockedOnWhatsApp"
      AND NOT c."isSpam"
      AND conv."closedAt" IS NULL
      AND conv."status"::TEXT = ${WaMessageAssignStatus.ASSIGNED}
      AND (
        EXISTS (
          SELECT 1 FROM "ConversationAssignedUserTeamMap" cam
          WHERE cam."conversationId" = conv.id
          AND cam."lastRemovedAt" IS NULL
          AND cam."userId" = ${userId}::uuid
        )
        OR EXISTS (
          SELECT 1 FROM "WaInboxAssign" winb
          WHERE winb."contactId" = c.id
          AND winb."assignedUserId" = ${userId}::uuid
        )
      );`;

  // Spam is contact-grained, and so is its badge: it counts contacts, not tickets,
  // to match the one-row-per-contact Spam tab.
  const spamCount = await prisma.contact.count({
    where: { orgId, isSpam: true },
  });
  const mentionedConversations = await prisma.inboxMention.findMany({
    where: { orgId, mentionedUserId: userId, clearedAt: null, contact: { isSpam: false } },
    select: { conversationId: true, contactId: true },
  });
  // A mention with no conversationId predates threading and lands on every one of
  // that contact's tickets, so it is counted per contact rather than per ticket.
  const mentionKeys = new Set(
    mentionedConversations.map((m) => m.conversationId ?? `contact:${m.contactId}`),
  );

  return {
    // The "New" tab lists UNASSIGNED conversations only (see `filterChats`), so its
    // badge counts unassigned — not assigned-to-team — to match the list.
    new: count[0].new_unassigned_count,
    newAssigned: count[0].new_assigned_count,
    newUnassigned: count[0].new_unassigned_count,
    newAssignedTome: 0,
    assignedToMe: mineCount[0]?.count ?? 0,
    mine: mineCount[0]?.count ?? 0,
    spam: spamCount,
    open: stats.open_count,
    closed: stats.closed_count,
    total: stats.all_count,
    favourite: favouriteCount,
    mentions: mentionKeys.size,
    assignedTeamWiseCount,
    // assigned: stats.assigned_count,
    // blocked: stats.blocked_count,
    // unassigned: stats.unassignedCount,
  };
}

/**
 * Inbox Tickets v2 — set the favourite/star flag on a single conversation (ticket),
 * org-scoped via the owning contact.
 */
export async function setConversationFavorite(
  orgId: string,
  conversationId: string,
  isFavorite: boolean,
) {
  const result = await prisma.conversation.updateMany({
    where: { id: conversationId, contact: { orgId } },
    data: { isFavorite },
  });
  return { success: result.count > 0, isFavorite };
}

/**
 * Mark a **contact** as spam, or take them back out of it.
 *
 * Spam is contact-grained on purpose: it describes the person, not one of their
 * tickets, so it is a flag on `Contact` rather than an `InboxStatus`. Marking
 * closes whatever tickets are still open (`closeReason = SPAM`) and revokes their
 * assignees, the same way any other close does — the contact then disappears from
 * every inbox tab and appears once in Spam.
 *
 * Unmarking only clears the flag: the closed tickets stay closed, since they were
 * genuinely finished. The contact's next inbound message opens a fresh ticket.
 */
export async function setContactSpam(
  orgId: string,
  contactId: string,
  isSpam: boolean,
  userId?: string,
  messageId?: string,
) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: { id: true, isSpam: true },
  });
  if (!contact) return { success: false, isSpam: false };
  if (contact.isSpam === isSpam) return { success: true, isSpam };

  const actor = resolveInboxActor(userId);
  const actingUserId = resolveClosedByUserId(actor);
  const now = new Date();

  if (isSpam) {
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id: contactId },
        data: {
          isSpam: true,
          spamMarkedAt: now,
          spamMarkedBy: actingUserId,
          waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
          closedAt: now,
          closedBy: actingUserId,
        },
      });
      // Every live ticket, not just the latest: the contact is gone from the inbox
      // now, so a ticket left open would be unreachable from any tab.
      await tx.conversation.updateMany({
        where: { contactId, closedAt: null },
        data: {
          status: WaMessageAssignStatus.CLOSED,
          closedAt: now,
          closedBy: actingUserId,
          closeReason: CloseReason.SPAM,
          closedByAutomation: actor.source === "automation",
          resolutionResult: null,
        },
      });
      // Assignments are revoked, not deleted, so a reopen can still read who was on
      // the ticket — mirrors what closing does everywhere else.
      await tx.conversationAssignedUserTeamMap.updateMany({
        where: { Conversation: { contactId }, lastRemovedAt: null },
        data: { lastRemovedAt: now, lastRemovedBy: actingUserId },
      });
      await tx.waInboxAssign.deleteMany({ where: { contactId } });
    });
  } else {
    await prisma.contact.update({
      where: { id: contactId },
      data: { isSpam: false, spamMarkedAt: null, spamMarkedBy: null },
    });
  }

  // The thread keeps a record of both directions. SPAM survives here as an *event*
  // label (see `InboxEventLabel`) even though it is no longer a stored status.
  await createInternalWaMessage({
    contactId,
    waMessageAssignStatus: isSpam ? WaMessageAssignStatus.SPAM : NOT_SPAM_EVENT,
    trigerredByUser: userId || "RateUp",
    messageId: messageId ?? crypto.randomUUID(),
  });

  return { success: true, isSpam };
}

// Matches the `WaMedia` zod schema in wamessage.schema.ts, where all three
// fields are required — they were previously (incorrectly) optional here even
// though every real caller (the media-send route) always supplies them.
export interface WaMedia {
  type: "audio" | "image" | "document" | "video";
  url: string;
  name: string;
}

export async function sendMediaMessages(
  media: WaMedia[],
  to: string,
  orgId: string,
  userId: string,
  platform: PlatformType,
  caption = "",
  whatsappSettingsPhoneId = "",
  teamId?: string,
) {
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const isLastItem = i === media.length - 1;
    const captionMsg = isLastItem ? caption : "";
    let messageBody: WaSendMessageBody | IgSendMessageBody | FbSendMessageBody | undefined;
    switch (item.type) {
      case "image": {
        messageBody = createReplyImageMessage(to, item.url, platform, captionMsg);
        break;
      }
      case "document": {
        messageBody = createDocumentMessage(to, item.url, item.name, captionMsg, platform);
        break;
      }
      case "video": {
        messageBody = createVideoMessage(to, item.url, platform, captionMsg);
        break;
      }
      case "audio": {
        messageBody = createAudioMessage(to, item.url, platform);
        break;
      }
    }
    // `item.type` is validated against exactly these four values at the schema
    // boundary, so this is unreachable in practice — but the switch has no
    // exhaustiveness guarantee, so guard rather than send a message body that
    // was never built.
    if (!messageBody) {
      log.error("Unsupported media type %s for %s; skipping item", item.type, to);
      continue;
    }
    await sendMessage(
      orgId,
      messageBody,
      undefined,
      userId,
      whatsappSettingsPhoneId,
      platform,
      undefined,
      teamId,
    );
    if (!isLastItem) wait(50);
  }
}

/** Meta refuses a read receipt for anything older than this. */
const MARK_AS_READ_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Channels whose customers see a read receipt. WEBCHAT and INTERNAL have no upstream. */
const READ_RECEIPT_PLATFORMS = [
  PlatformType.WHATSAPP,
  PlatformType.INSTAGRAM,
  PlatformType.FACEBOOK,
];

/**
 * Tells the channel the customer's latest inbound message has been seen, so
 * their WhatsApp ticks turn blue / their Instagram or Messenger thread shows
 * "Seen" when an agent opens the conversation.
 *
 * Only the newest message is acknowledged. WhatsApp marks every earlier message
 * in the conversation read along with it, and the Meta sender action applies to
 * the thread rather than to a specific message — one call covers the thread
 * either way.
 *
 * Best-effort: a failed receipt must not fail the agent's action, and the
 * conversation is already marked read on our side regardless.
 */
async function sendReadReceipt(contactId: string) {
  const latest = await prisma.waMessage.findFirst({
    where: {
      contactId,
      sourcePlatform: { in: READ_RECEIPT_PLATFORMS },
      messageBody: { path: ["exchangeProcess"], equals: "receive" },
      waCreatedAt: { gte: new Date(Date.now() - MARK_AS_READ_MAX_AGE_MS) },
    },
    orderBy: { waCreatedAt: "desc" },
    select: {
      messageId: true,
      sourceIdentifier: true,
      sourcePlatform: true,
      contact: { select: { orgId: true, phone: true, igsId: true, psid: true } },
    },
  });

  const orgId = latest?.contact?.orgId;
  if (!latest || !orgId || !latest.sourceIdentifier) return;

  if (latest.sourcePlatform === PlatformType.WHATSAPP) {
    // Addressed by message id, and only WhatsApp needs one.
    if (!latest.messageId) return;
    // Inbound messages carry the business number they arrived on; resolve the
    // channel from that so a multi-number org acknowledges on the right one.
    const channel = await getWaSettingsByPhone(latest.sourceIdentifier);
    const waSettings = await getWaSettings(orgId, channel?.phoneId ?? undefined);
    if (!waSettings?.phoneId) return;

    await callMetaApi(`/${waSettings.phoneId}/messages`, "POST", waSettings.accessToken, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: latest.messageId,
    });
    return;
  }

  // Instagram and Messenger share one Send API shape: a sender action addressed
  // to the person, with no message id. Meta requires the request to carry
  // nothing but `recipient` and `sender_action`.
  const isInstagram = latest.sourcePlatform === PlatformType.INSTAGRAM;
  const settings = isInstagram
    ? await getInstagramChannel(latest.sourceIdentifier, orgId)
    : await getMessengerChannel(latest.sourceIdentifier, orgId);
  const accessToken = settings?.pageAccessToken;
  // Instagram threads key off the IGSID, Messenger off the page-scoped id.
  const recipientId = isInstagram ? latest.contact?.igsId : latest.contact?.psid;
  if (!accessToken || !recipientId) return;

  const body = { recipient: { id: recipientId }, sender_action: "mark_seen" };
  // Instagram takes the token as a query parameter, Messenger as a bearer —
  // the same split `sendMessage` makes for outbound messages on these channels.
  await (isInstagram
    ? callMetaApi("/me/messages", "POST", undefined, body, {
        params: { access_token: accessToken },
      })
    : callMetaApi("/me/messages", "POST", accessToken, body));
}

export async function markMessagesAsRead(contactId: string, userId: string) {
  const marked = await prisma.$executeRawUnsafe(
    `
    UPDATE "WaMessage"
    SET "readUsers" = "readUsers" || $2::TEXT
    WHERE "contactId" = $1::uuid AND
    "messageBody"->>'exchangeProcess' = 'receive'
    AND NOT ($2::TEXT = ANY("readUsers"))
  `,
    contactId,
    userId,
  );

  // Nothing newly read means the receipt was already sent when whoever read it
  // first opened the thread — re-sending on every open would be one Graph call
  // per poll.
  if (marked > 0) {
    void sendReadReceipt(contactId).catch((e) =>
      log.error({ err: e, contactId }, "Failed to send the read receipt"),
    );
  }

  // NOTE: opening a conversation deliberately does NOT clear the reader's
  // @mentions — the "@Mentions" tab must keep the conversation until the user
  // acts on it. Mentions are cleared when the user replies (see
  // `clearMentionsForConversation`, called from the send path).
}

/**
 * Clear the given user's unseen @mentions on a conversation (or, for legacy
 * mentions with no conversationId, on the contact). Called when the user replies,
 * so the "@Mentions" tab/badge drops the conversation only after they engage.
 */
export async function clearMentionsForConversation(
  userId: string,
  contactId: string,
  conversationId?: string | null,
) {
  await prisma.inboxMention.updateMany({
    where: {
      mentionedUserId: userId,
      clearedAt: null,
      ...(conversationId
        ? { OR: [{ conversationId }, { conversationId: null, contactId }] }
        : { contactId }),
    },
    data: { clearedAt: new Date() },
  });
}

export async function sendContactMessage(
  contacts: { contactIds?: string[]; groupIds?: string[] },
  phone: string,
  orgId: string,
  userId: string,
  whatsappSettingsPhoneId: string,
  teamId?: string,
) {
  if (!contacts.contactIds && !contacts.groupIds) return;
  const orConditions: Prisma.ContactWhereInput[] = [];
  if (contacts.contactIds && contacts.contactIds.length) {
    orConditions.push({
      id: {
        in: contacts.contactIds,
      },
    });
  }
  if (contacts.groupIds && contacts.groupIds.length) {
    orConditions.push({
      contactGroups: {
        some: {
          contactGroupId: {
            in: contacts?.groupIds,
          },
        },
      },
    });
  }
  const filterCondition: Prisma.ContactWhereInput = { OR: orConditions };
  const contactsData = await prisma.contact.findMany({
    where: filterCondition,
    select: {
      name: true,
      phone: true,
      dob: true,
      email: true,
      whatsappUserName: true,
      org: {
        select: {
          name: true,
        },
      },
    },
  });

  const messageBody = createContactMessage(phone, contactsData);
  await sendMessage(
    orgId,
    messageBody,
    undefined,
    userId,
    whatsappSettingsPhoneId,
    undefined,
    undefined,
    teamId,
  );
}

export async function sendLocationMessage(
  location: WaSendMessageBody["location"],
  phone: string,
  orgId: string,
  userId: string,
  whatsappSettingsPhoneId: string,
  teamId?: string,
) {
  const messageBody = createLocationMessage(phone, location);
  await sendMessage(
    orgId,
    messageBody,
    undefined,
    userId,
    whatsappSettingsPhoneId,
    undefined,
    undefined,
    teamId,
  );
}

export async function getWaMessageByMessageId(messageId: string): Promise<WaMessage | null> {
  return await prisma.waMessage.findFirst({
    where: {
      messageId,
    },
  });
}

/**
 * Flag a message the customer revoked (deleted) on WhatsApp. The row and its
 * body are kept on purpose — the thread shows "this message was deleted" while
 * the history of what was actually said stays auditable. Scoped by org so a
 * wamid from another account can never touch this org's messages, and idempotent
 * so a redelivered webhook keeps the first deletion time.
 */
export async function markWaMessageAsDeleted(waMessageId: string, orgId: string) {
  if (!waMessageId) return null;

  const message = await prisma.waMessage.findFirst({
    where: {
      messageId: waMessageId,
      contact: { orgId },
    },
  });

  if (!message) {
    log.warn("Revoke received for unknown message id: %s (org %s)", waMessageId, orgId);
    return null;
  }

  if (message.deletedAt) return message;

  return await prisma.waMessage.update({
    where: { id: message.id },
    data: { deletedAt: new Date() },
  });
}

export async function updateWaMessageByMessageId(
  messageId: string,
  data: Prisma.WaMessageUncheckedUpdateInput,
  id?: string,
) {
  if (!id && !messageId) {
    log.warn("updateWaMessageByMessageId called with no id and no messageId; refusing");
    return null;
  }
  const whereClause = id ? { id } : { messageId };

  const message = await prisma.waMessage.findFirst({
    where: whereClause,
  });

  if (!message) {
    log.trace("Message not found on %s: %s", id ? "id" : "messageId", id || messageId);
    return null;
  }

  return await prisma.waMessage.update({
    where: {
      id: message.id,
    },
    data: {
      ...data,
      // `stats` is a free-form JSON blob of delivery-status timestamps — merge
      // the caller's partial update over the existing row rather than replacing it.
      stats: data.stats
        ? {
            ...(message.stats as Record<string, unknown>),
            ...(data.stats as Record<string, unknown>),
          }
        : undefined,
    },
  });
}

export async function generateChatAnalytics(orgId: string) {
  const analytics = await prisma.$queryRaw<
    Array<{
      newChatCount: number;
      waMessageCount: number;
      unassignedContactCount: number;
      assignedContactCount: number;
      newContactCount: number;
      closedContactCount: number;
      blockedContactCount: number;
      waInboxAssignedCount: number;
    }>
  >`
    SELECT
      (SELECT COUNT(*)::INTEGER FROM "Contact" c WHERE c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours' AND c."orgId" = ${orgId}::uuid) 
        AS "newChatCount",
      (SELECT COUNT(*)::INTEGER FROM "WaMessage" wm 
        JOIN "Contact" c ON wm."contactId" = c.id 
        WHERE c."orgId" = ${orgId}::uuid) 
        AS "waMessageCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'UNASSIGNED') 
        AS "unassignedContactCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'ASSIGNED') 
        AS "assignedContactCount",
      -- "NEW" is a derived tab (unassigned + received within 24h), never a stored
      -- status. This previously compared against a literal 'NEW' and so always
      -- counted zero.
      (SELECT COUNT(*)::INTEGER FROM "Contact" c
        WHERE c."orgId" = ${orgId}::uuid
          AND c."waMessageAssignStatus" = 'UNASSIGNED'
          AND c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours')
        AS "newContactCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'CLOSED') 
        AS "closedContactCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."blockedOnWhatsApp" = true) 
        AS "blockedContactCount",
      (SELECT COUNT(*)::INTEGER FROM "WaInboxAssign" wa 
        JOIN "Contact" c ON wa."contactId" = c.id 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" != 'UNASSIGNED') 
        AS "waInboxAssignedCount"
  `;
  const assignedUserCounts = await prisma.$queryRaw`
      SELECT 
        uac."userId",
        uac."assignCount"::INTEGER,
        uac."createdAt"::TIMESTAMP AS "createdAt",
        u."name" as "userName"
      FROM "UserAssignedCount" uac
      JOIN "User" u ON uac."userId" = u.id
      WHERE uac."orgId" = ${orgId}::uuid
      ORDER BY uac."createdAt" DESC
  `;

  return { ...analytics?.[0], assignedUserCounts };
}

export async function getChatByContactId(
  req: FastifyRequest<{ Params: ByContactIdParams }>,
  res: FastifyReply,
) {
  const { contactId } = req.params;
  try {
    const chat = await prisma.waMessage.findMany({
      where: {
        contactId,
        sourcePlatform: "WEBCHAT",
      },
      orderBy: {
        waCreatedAt: "asc",
      },
    });
    return res.status(200).send(chat);
  } catch (error) {
    log.error({ err: error }, "Error in getChatByContactId");
    res.status(500).send({ error: "Failed to retrieve chat" });
  }
}

/**
 * Seed chats for all contacts
 */
export async function generateInboxResponse(
  body: GenerateInboxResponseBody,
  orgId: string,
  _userId: string,
) {
  let skip = 0;
  if (body.numberOfContacts === 1) {
    skip = Math.floor(Math.random() * 100);
  }
  let contacts = await prisma.contact.findMany({
    where: { orgId: orgId },
    take: body.numberOfContacts || 5,
    skip,
  });

  //if contact table does n't have 100 records
  if (body.numberOfContacts === 1 && !contacts.length) {
    contacts = await prisma.contact.findMany({
      where: { orgId: orgId },
      take: body.numberOfContacts || 5,
    });
  }

  const settings = await getWaSettings(orgId);
  if (!settings) {
    throw new Error(`WhatsApp settings not found for org ${orgId}`);
  }

  for (const contact of contacts) {
    console.log(`Seeding chats for contact: ${contact.name} (${contact.phone})`);

    for (let i = 0; i < (body.messagesPerContact || 1); i++) {
      const isSend = faker.datatype.boolean();
      sendMessageQueue.add("send-message", {
        message: faker.lorem.sentence(),
        contactId: contact.id,
        options: {
          accessToken: settings.accessToken,
          phoneId: settings.phoneId,
          phone: settings.phone,
          sourceIdentifier: channelDigits(settings.phone),
          orgId: orgId,
          profileName: contact?.name,
          to: contact.phone,
        },
        type: isSend ? "send" : "receive",
      });
    }
  }
}

export async function createInternalWaMessage({
  contactId,
  waMessageAssignStatus,
  trigerredByUser,
  assignedUsers,
  messageId,
  conversationId,
}: {
  contactId: string;
  waMessageAssignStatus?: string;
  trigerredByUser?: string;
  assignedUsers?:
    | { userId: string; teamId: string }[]
    | {
        added: { userId: string; teamId: string }[];
        removed: { userId: string; teamId: string }[];
      };
  messageId: string;
  /** The ticket the event belongs to; defaults to the contact's newest. */
  conversationId?: string;
}) {
  const ticketId = conversationId ?? (await getLastCreatedConversationForContact(contactId))?.id;

  // `id` is null for the system/automation actor (it has no user row), and the
  // whole value stays null when a real user id was given but that user has no
  // `name` set — both are genuine, not just type-theoretical: `User.name` is
  // optional in the schema.
  let triggeredByUserDetails: { id: string | null; name: string } | null = null;

  if (trigerredByUser && trigerredByUser !== "RateUp" && trigerredByUser !== "Automation") {
    const user = await prisma.user.findUnique({
      where: { id: trigerredByUser },
      select: { id: true, name: true },
    });

    if (user?.name) {
      triggeredByUserDetails = { id: user.id, name: user.name };
    }
  }
  if (trigerredByUser === "RateUp" || trigerredByUser === "Automation") {
    triggeredByUserDetails = { id: null, name: trigerredByUser };
  }
  let addedUsers: { userId: string; teamId: string }[] = [];
  let removedUsers: { userId: string; teamId: string }[] = [];

  if (Array.isArray(assignedUsers)) {
    addedUsers = assignedUsers;
  } else if (assignedUsers) {
    addedUsers = assignedUsers.added || [];
    removedUsers = assignedUsers.removed || [];
  }

  let messageText: string;
  // Optional to match `waMessageAssignStatus` above (the `default:` branch below
  // stores it verbatim, including when it's undefined).
  let assignStatus: string | undefined;
  let assignedUserDetails: { id: string; name: string }[] = [];

  if (
    (waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED ||
      waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED ||
      waMessageAssignStatus === "REASSIGNED") &&
    (addedUsers.length || removedUsers.length)
  ) {
    const userIds = [...addedUsers.map((u) => u.userId), ...removedUsers.map((u) => u.userId)];

    if (userIds.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });

      assignedUserDetails = users.filter((u) => u.name).map((u) => ({ id: u.id, name: u.name! }));
    }
  }

  switch (waMessageAssignStatus) {
    // Spam is a property of the *contact*, so its two events say "contact", not
    // "chat" — the same event lands on whichever ticket is current.
    case WaMessageAssignStatus.SPAM:
      messageText = "marked this contact as spam";
      assignStatus = WaMessageAssignStatus.SPAM;
      break;

    case NOT_SPAM_EVENT:
      messageText = "marked this contact as not spam";
      assignStatus = NOT_SPAM_EVENT;
      break;

    case WaMessageAssignStatus.ASSIGNED:
      messageText = assignedUserDetails.length
        ? `Chat assigned to ${assignedUserDetails.map((u) => u.name).join(", ")}`
        : "Assigned this chat";
      assignStatus = WaMessageAssignStatus.ASSIGNED;
      break;

    case WaMessageAssignStatus.UNASSIGNED:
      messageText = assignedUserDetails.length
        ? `Chat revoked from ${assignedUserDetails.map((u) => u.name).join(", ")}`
        : "Unassigned this chat";
      assignStatus = WaMessageAssignStatus.UNASSIGNED;
      break;

    case "REASSIGNED":
      const addedNames = assignedUserDetails
        .filter((u) => addedUsers.find((a) => a.userId === u.id))
        .map((u) => u.name);

      const removedNames = assignedUserDetails
        .filter((u) => removedUsers.find((r) => r.userId === u.id))
        .map((u) => u.name);

      messageText = `Chat reassigned${
        removedNames.length ? ` from ${removedNames.join(", ")}` : ""
      }${addedNames.length ? ` to ${addedNames.join(", ")}` : ""}`;
      assignStatus = "REASSIGNED";
      break;

    default:
      messageText =
        (trigerredByUser === "RateUp" || trigerredByUser === "Automation") &&
        waMessageAssignStatus === WaMessageAssignStatus.CLOSED
          ? "marked this chat as closed by automation"
          : `marked this chat as ${getStatusLabel(waMessageAssignStatus)}`;
      assignStatus = waMessageAssignStatus;
  }

  const byId = new Map(assignedUserDetails.map((u) => [u.id, u]));
  const summary = internalEventSentence({
    status: assignStatus,
    actor: triggeredByUserDetails,
    added: addedUsers.map((u) => byId.get(u.userId)).filter((u) => u !== undefined),
    removed: removedUsers.map((u) => byId.get(u.userId)).filter((u) => u !== undefined),
    fallback: messageText,
  });

  const wamessage = await prisma.waMessage.create({
    data: {
      contactId,
      messageId: messageId,
      conversationId: ticketId,
      sourcePlatform: PlatformType.INTERNAL,
      sourceIdentifier: "internal",
      sendBy: triggeredByUserDetails?.id,
      waCreatedAt: new Date(),
      messageBody: {
        exchangeProcess: "internal",
        internal: {
          text: { body: messageText },
          // The finished sentence. `text.body` stays the old fragment so rows written
          // before this keep rendering, and a client that has not been updated still works.
          summary,
          triggeredByUser: triggeredByUserDetails,
          assignStatus,
          assignedUsers: assignedUserDetails,
        },
      },
      sourceMessage: "inbox",
    },
  });
  return wamessage;
}

function getStatusLabel(status: string | undefined): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    [WaMessageAssignStatus.CLOSED]: "closed",
    [WaMessageAssignStatus.SPAM]: "spam",
    [WaMessageAssignStatus.RESOLVED]: "resolved",
    [WaMessageAssignStatus.UNRESOLVED]: "unresolved",
  };
  return map[status] ?? null;
}

interface CreateWaMessageOrgTeamMapInput {
  // Matches the nullable `WaMessageOrgTeamMap.teamId` column (unassigned sends
  // have no team) — was incorrectly required here even though the one real
  // caller already computes a possibly-null value.
  teamId: string | null;
  messageId: string;
  orgId: string;
  isAutomedMessage?: boolean;
  type: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW";
  externalApi: boolean;
}

export async function createWaMessageOrgTeamMap(data: CreateWaMessageOrgTeamMapInput) {
  return prisma.waMessageOrgTeamMap.create({
    data: {
      teamId: data.teamId,
      messageId: data.messageId,
      orgId: data.orgId,
      isAutomedMessage: data.isAutomedMessage ?? false,
      type: data.type,
      externalApi: data.externalApi,
    },
  });
}

export async function getWaMessageLogs(
  orgId: string,
  dateRange?: string[],
  status?: string,
  sourceMessage?: string,
  team?: string,
  limit: number = 25,
  offset: number = 0,
  searchQuery?: string,
) {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }

  const teamFilter =
    team && team !== "all" && team !== "null"
      ? Prisma.sql`AND motm."teamId" = ${team}::uuid`
      : Prisma.sql``;

  // The same index-friendly pair of predicates the analytics panels use: the
  // range on the map row picks the rows, the one on the message keeps it exact.
  const dateFilter = rangeStart && rangeEnd ? dateFilterFor(rangeStart, rangeEnd) : Prisma.sql``;

  let sourceFilter = Prisma.sql``;
  if (sourceMessage && sourceMessage !== "all") {
    if (sourceMessage === "external") {
      sourceFilter = Prisma.sql`AND motm."externalApi" = true`;
    } else if (sourceMessage === "TEMPLATE") {
      sourceFilter = Prisma.sql`AND wm."sourceMessage" = ${sourceMessage} AND motm."externalApi" = false`;
    } else {
      sourceFilter = Prisma.sql`AND wm."sourceMessage" = ${sourceMessage}`;
    }
  }

  const statusFilter =
    status && status !== "all" ? Prisma.sql`AND LOWER(ws.status) = LOWER(${status})` : Prisma.sql``;

  const isNumericSearch = searchQuery && /^\d+$/.test(searchQuery.trim());

  const searchFilter =
    searchQuery && searchQuery.trim() !== ""
      ? isNumericSearch
        ? Prisma.sql`AND c.phone ILIKE ${`%${searchQuery}%`}`
        : Prisma.sql`AND (
            c.phone ILIKE ${`%${searchQuery}%`} OR
            wm."messageBody"::text ILIKE ${`%${searchQuery}%`}
          )`
      : Prisma.sql``;

  // The map row carries the same org as the contact the message went to. Naming
  // it as well lets the (orgId, createdAt) index on the map table drive the scan.
  const baseWhere = Prisma.sql`
    WHERE c."orgId" = ${orgId}
      AND motm."orgId" = ${orgId}::uuid
      AND wm."sourceMessage" IN ('TEMPLATE','CAMPAIGN')
      AND wm."messageBody"->>'exchangeProcess' = 'send'
      ${sourceFilter}
      ${teamFilter}
      ${dateFilter}
      ${statusFilter}
      ${searchFilter}
  `;

  const statusJoin =
    status && status !== "all"
      ? Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT
        CASE
          WHEN failed_ts = greatest_ts THEN 'failed'
          WHEN read_ts = greatest_ts THEN 'read'
          WHEN delivered_ts = greatest_ts THEN 'delivered'
          WHEN sent_ts = greatest_ts THEN 'sent'
        END AS status
      FROM (
        SELECT
          NULLIF(wm.stats->>'sent','')::timestamp      AS sent_ts,
          NULLIF(wm.stats->>'delivered','')::timestamp AS delivered_ts,
          NULLIF(wm.stats->>'read','')::timestamp      AS read_ts,
          NULLIF(wm.stats->>'failed','')::timestamp    AS failed_ts,
          GREATEST(
            NULLIF(wm.stats->>'sent','')::timestamp,
            NULLIF(wm.stats->>'delivered','')::timestamp,
            NULLIF(wm.stats->>'read','')::timestamp,
            NULLIF(wm.stats->>'failed','')::timestamp
          ) AS greatest_ts
      ) t
    ) ws ON true
  `
      : Prisma.sql``;

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    JOIN "WaMessageOrgTeamMap" motm ON motm."messageId" = wm.id
    ${statusJoin}
    ${baseWhere}
  `;

  const total = Number(countResult[0]?.count ?? 0);

  /*
  ---------------------------------------------------
  2️⃣ GET IDS FIRST (LIMIT BEFORE HEAVY PROCESSING)
  ---------------------------------------------------
  */

  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT wm.id
    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    JOIN "WaMessageOrgTeamMap" motm ON motm."messageId" = wm.id
    ${statusJoin}
    ${baseWhere}
    ORDER BY wm."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  if (ids.length === 0) {
    return {
      data: [],
      pagination: {
        total,
        limit,
        offset,
        pageIndex: Math.floor(offset / limit),
        pageSize: limit,
      },
    };
  }

  const idList = ids.map((r) => r.id);

  /*
  ---------------------------------------------------
  3️⃣ FETCH FULL DATA FOR THOSE IDS ONLY
  ---------------------------------------------------
  */

  const data = await prisma.$queryRaw<
    Array<{
      id: string;
      createdAt: Date;
      sourceMessage: string;
      contactId: string;
      phone: string;
      messageType: string | null;
      messagePreview: string;
      status: string | null;
      logs: WaGraphApiErrorDetail | null;
      errorMessage: string | null;
    }>
  >`
    SELECT
      wm.id,
      wm."createdAt",
      wm."sourceMessage",
      wm."contactId",
      wm.logs,
      wm."errorMessage",
      c.phone,

      wm."messageBody"->'send'->>'type' AS "messageType",

      CASE wm."messageBody"->'send'->>'type'
        WHEN 'text' THEN wm."messageBody"->'send'->'text'->>'body'
        WHEN 'template' THEN COALESCE(
          wm."messageBody"->'send'->'template'->>'name',
          wm."messageBody"->'send'->'template'->'components'->0->>'text',
          'template message'
        )
        WHEN 'image' THEN COALESCE(
          wm."messageBody"->'send'->'image'->>'caption',
          'image file'
        )
        WHEN 'video' THEN COALESCE(
          wm."messageBody"->'send'->'video'->>'caption',
          'video file'
        )
        WHEN 'audio' THEN 'audio file'
        WHEN 'document' THEN COALESCE(
          wm."messageBody"->'send'->'document'->>'caption',
          wm."messageBody"->'send'->'document'->>'filename',
          'document file'
        )
        WHEN 'contacts' THEN 'contact card'
        WHEN 'location' THEN 'location'
        ELSE 'unknown'
      END AS "messagePreview",

      ws.status

    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    LEFT JOIN LATERAL (
      SELECT
        CASE
          WHEN failed_ts = greatest_ts THEN 'failed'
          WHEN read_ts = greatest_ts THEN 'read'
          WHEN delivered_ts = greatest_ts THEN 'delivered'
          WHEN sent_ts = greatest_ts THEN 'sent'
        END AS status
      FROM (
        SELECT
          NULLIF(wm.stats->>'sent','')::timestamp      AS sent_ts,
          NULLIF(wm.stats->>'delivered','')::timestamp AS delivered_ts,
          NULLIF(wm.stats->>'read','')::timestamp      AS read_ts,
          NULLIF(wm.stats->>'failed','')::timestamp    AS failed_ts,
          GREATEST(
            NULLIF(wm.stats->>'sent','')::timestamp,
            NULLIF(wm.stats->>'delivered','')::timestamp,
            NULLIF(wm.stats->>'read','')::timestamp,
            NULLIF(wm.stats->>'failed','')::timestamp
          ) AS greatest_ts
      ) t
    ) ws ON true
    WHERE wm.id IN (${Prisma.join(idList)})
    ORDER BY wm."createdAt" DESC
  `;

  /*
  ---------------------------------------------------
  4️⃣ OPTIONAL STATUS FILTER IN NODE (CHEAPER)
  ---------------------------------------------------
  */

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      pageIndex: Math.floor(offset / limit),
      pageSize: limit,
    },
  };
}
