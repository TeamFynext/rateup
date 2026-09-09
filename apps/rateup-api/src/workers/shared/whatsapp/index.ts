import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { log } from "../logger.js";
import { publisher } from "../ws.publisher.js";
import prisma from "../../../utils/prisma.js";
import dbPool from "../../../utils/db.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import type { PrismaTransaction } from "../prismaTypes.js";
import type { WaMessageOrgTeamType } from "../../../../generated/prisma/enums.js";
import {
  PlatformType,
  WaTemplateCategory,
  WaTemplateComponentType,
  WHATSAPP_BUTTON_TYPE,
} from "../types/enum.js";
import type {
  CreateWaMessageOrgTeamMapInput,
  orgWsMessage,
  WaInboxMessageBody,
  WaSendMessageBody,
  WaTemplateComponent,
  WaTemplateData,
} from "../types/dispatcher.types.js";
import {
  metaErrorMessage,
  sendMetaMessage,
} from "../../../modules/whatsapp/meta/metaMessage.service.js";
import type { WaStatusPricing } from "../../../types/whatsapp.types.js";
import {
  normalizePricingCategory,
  normalizePricingModel,
} from "../../../modules/whatsapp/metering/pricing.utils.js";
import crypto from "node:crypto";
import { Queue } from "bullmq";
// Defined in its own dependency-free module so `queues/campaign.queue.ts` can
// share the key without importing this one; re-exported here because the send
// and drain paths read it from beside `enqueueCampaignMessages`.
import { campaignSendJobId, campaignSendJobsKey } from "../campaignSendKeys.js";

export { campaignSendJobsKey };

// `returnAppropriateTimeStamp` calls `.utc()`. message-dispatcher registered this
// in its entrypoint; here the module registers it itself rather than depending on
// some other import having done it first. `extend` is idempotent.
dayjs.extend(utc);

export const BATCH_SIZE = 5000; // Define batch size for processing
// Interface for WaMessage stats object
export interface WaMessageStats {
  read: string;
  sent: string;
  failed: string;
  delivered: string;
}

interface SendMessageOptions {
  accessToken: string;
  phoneId: string;
  phone: string;
  sourceIdentifier: string;
  orgId: string;
}

interface SendMessageResult {
  status: boolean;
  message: string;
}

export async function returnAppropriateTimeStamp(messageBody: WaInboxMessageBody) {
  if (messageBody.exchangeProcess === "receive") {
    const unixTimeStamp = Number.parseInt(messageBody.receive!.messages[0].timestamp);
    const utcTimeStamp = dayjs.unix(unixTimeStamp).utc().format();
    return utcTimeStamp;
  }
  return dayjs().utc().format();
}

export async function getCampaignById(campaignId: string) {
  try {
    const [campaign] = await prisma.$queryRaw<any[]>`
      SELECT 
        c.*, 
        wt."data" as "templateData", 
        t."name" as "teamName", 
        wf."version" as "flowVersion",
        (
          SELECT COALESCE(json_agg(cds), '[]'::json)
          FROM "CampaignDripStage" cds
          WHERE cds."campaignId" = c.id
        ) as "dripStages"
      FROM "Campaign" c 
      LEFT JOIN "WaTemplate" wt ON wt.id = c."waTemplateId" 
      LEFT JOIN "Team" t ON t.id = c."teamId"
      LEFT JOIN "WaFlow" wf ON wf."dbFlowId" = NULLIF(c."flowId",'')::uuid 
      WHERE c.id = ${campaignId}::uuid
    `;
    return campaign;
  } catch (error) {
    log.error({ err: error }, "Error in getCampaignById:");
    throw error;
  }
}

/**
 * Extract flow ID from template components if present
 * @param components Template components containing potential flow button
 * @returns Flow ID string or undefined if not found
 */
export function getFlowIdFromTemplateComponents(
  components: WaTemplateComponent[],
): string | undefined {
  if (!components || !Array.isArray(components)) {
    return undefined;
  }

  const flowId = components
    .find((c) => c.type?.toLocaleLowerCase?.() === WaTemplateComponentType.BUTTONS)
    ?.buttons?.find((b) => b.type === WHATSAPP_BUTTON_TYPE.FLOW)
    ?.flow_id?.toString();

  return flowId;
}

/**
 * Decrypt AES-256-CBC encrypted data using key and IV
 * @param encryptedData Hex-encoded encrypted string
 * @param encryptionKey Encryption key
 * @param iv Hex-encoded initialization vector
 * @returns Decrypted string
 */
export function aes_decrypt(
  encryptedData: string,
  encryptionKey: crypto.CipherKey,
  iv: string,
): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, Buffer.from(iv, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// The gap between consecutive daily-send batches. Overridable so a test run can
// watch a multi-"day" campaign drain in minutes instead of days. Unset (the
// production case) means one real day.
const CAMPAIGN_BATCH_INTERVAL_MS =
  Number.parseInt(process.env.CAMPAIGN_BATCH_INTERVAL_MS || "", 10) || DAY_IN_MS;

export interface EnqueueCampaignMessagesOptions {
  /** BullMQ queue to fan out onto. */
  queue: Queue;
  participants: any[];
  campaignId: string;
  /**
   * The send session every job in this fan-out belongs to. Load-bearing: it is
   * what makes job ids unique per attempt, so a resend to a participant already
   * sent to is not swallowed by BullMQ's deduplication.
   */
  campaignSendId: string;
  scheduledAt?: string | null;
  /** Decrypted once for the whole batch by the caller. */
  accessToken?: string;
  surveyTeamMapId?: string | null;
  connection?: any;
  /**
   * Max messages per day; participants beyond the cap are pushed onto later days
   * rather than all firing at once.
   */
  dailySendLimit?: number;
}

/**
 * Enqueue one message job per participant for a single send session.
 *
 * Takes an options object rather than positional arguments deliberately: adding
 * `campaignSendId` as another `string` in a run of optional strings would have
 * compiled fine at every call site while silently shifting `scheduledAt` into
 * it.
 */
export async function enqueueCampaignMessages({
  queue,
  participants,
  campaignId,
  campaignSendId,
  scheduledAt,
  accessToken,
  surveyTeamMapId,
  connection,
  dailySendLimit,
}: EnqueueCampaignMessagesOptions): Promise<void> {
  if (!participants.length) {
    return;
  }
  const campaignJobIds = [];
  // Calculate delay once if scheduledAt is provided
  const baseDelay = scheduledAt ? dayjs(scheduledAt).diff(dayjs(), "millisecond") : 0;

  // A positive cap spreads participants across consecutive days: the first
  // `dailySendLimit` go out at the base time, the next batch a day later, and
  // so on. Without a cap every job keeps the single shared delay.
  const throttle = dailySendLimit && dailySendLimit > 0 ? dailySendLimit : 0;
  const delayFor = (index: number) => {
    const batchOffset = throttle ? Math.floor(index / throttle) : 0;
    const delay = baseDelay + batchOffset * CAMPAIGN_BATCH_INTERVAL_MS;
    // A past `scheduledAt` yields a negative delay; BullMQ wants >= 0.
    return delay > 0 ? delay : undefined;
  };

  // A drip participant is sent once per stage, so its job identity must be the
  // per-stage row -- not the participant, which is shared across every stage.
  // Reusing the participant id would make a still-delayed stage-1 job swallow
  // stage 2's enqueue as a duplicate.
  //
  // Scoped to the send session on top of that. Without the prefix the
  // deduplication below — which exists so the drip cron's 4-minute re-enqueue
  // does not reset delays — would also swallow every *retry* to a participant
  // this campaign has already sent to, making the retry engine inert.
  const jobIdFor = (participant: any) =>
    campaignSendJobId(campaignSendId, participant?.dripCampaignParticipantId ?? participant.id);

  // Process in batches for better memory usage
  const jobs = participants.map((participant, index) => ({
    // Named after the send, not the campaign: `getCampaignScheduleInfo` reads
    // this to find a campaign's still-delayed jobs, and a campaign can have more
    // than one send session with jobs outstanding.
    name: campaignSendId,
    data: {
      id: participant.id, // Include only necessary fields
      phone: participant.phone,
      phoneId: participant.phoneId,
      contactId: participant.contactId,
      orgId: participant.orgId,
      name: participant.name,
      customFields: participant.customFields,
      accessToken,
      scheduledAt,
      campaignId,
      campaignSendId,
      surveyTeamMapId,
      dynamicTags: participant.dynamicTags,
      teamId: participant.teamId,
      data: participant.data,
      defaultValues: participant.defaultValues,
      sourceIdentifier: participant.sourceIdentifier,
      dripCampaignParticipantId: participant?.dripCampaignParticipantId,
      dripStageId: participant?.dripStageId,
    },
    opts: {
      jobId: jobIdFor(participant),
      delay: delayFor(index),
      removeOnComplete: true,
      // Deduplication keeps the cron's 4-minute re-enqueue of a still-pending
      // drip stage from resetting a job's delay or double-sending.
      deduplication: { id: jobIdFor(participant) },
    },
  }));

  // Add jobs in batches to prevent memory issues
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    await queue.addBulk(batch);

    campaignJobIds.push(...batch.map((job) => job.opts.jobId));
  }
  if (campaignJobIds.length > 0) {
    // Keyed by send, not campaign, so "the queue has drained" is answerable per
    // attempt — which is what closes a CampaignSend and schedules the next retry.
    await connection.sadd(campaignSendJobsKey(campaignSendId), ...campaignJobIds);
  }

  log.info(
    throttle
      ? `Enqueued ${participants.length} messages for campaign ${campaignId} (send ${campaignSendId}) over ${Math.ceil(
          participants.length / throttle,
        )} batch(es) of ${throttle}, spaced ${CAMPAIGN_BATCH_INTERVAL_MS}ms apart`
      : `Enqueued ${participants.length} messages for campaign ${campaignId} (send ${campaignSendId})`,
  );
}

/**
 * Fetch campaign participants with optimized database query
 * @param campaignId Campaign ID
 * @param participantId Optional specific participant ID
 * @param sendToStatuses Optional status filter array
 * @param participantIds Optional explicit cohort. Narrower than `sendToStatuses`
 *   and applied on top of it: the retry engine uses this to enforce the exact
 *   truncation the conversation allowance permits, rather than relying on a
 *   status filter that could widen between deciding and sending.
 * @returns Array of participants with required data
 */
export async function fetchCampaignParticipants(
  campaignId: string,
  participantId?: string,
  sendToStatuses?: string[],
  dripStageId?: string,
  participantIds?: string[],
): Promise<any[]> {
  // If dripStageId is present, use CampaignDripStage and CampaignParticipantDripStage
  if (dripStageId) {
    // Get waTemplateId from CampaignDripStage
    const dripStage = await prisma.campaignDripStage.findUnique({
      where: { id: dripStageId },
      select: { waTemplateId: true },
    });
    if (!dripStage) return [];

    // Fetch campaign settings to check consent requirement
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { useUserConsent: true },
    });

    let query = `
    SELECT 
    cp.id,
    c.phone,
    c.name,
    c."orgId",
    c.id as "contactId",
    camp."dynamicTags",
    camp."teamId",
    wt.data,
    wt."defaultValues",
    camp.id as "campaignId",
    was."accessToken",
    was."phoneId",
    was."phone" as "sourceIdentifier",
    was."accessToken_iv",
    cpds.id as "dripCampaignParticipantId",
    cpds."dripStageId",
    COALESCE(
      json_agg(
        json_build_object(
          'slug', ccf.slug,
          'value', ccfv.value
        )
      ) FILTER (WHERE ccfv.id IS NOT NULL),
      '[]'
    ) AS "customFields"
  FROM "CampaignParticipantDripStage" cpds
  JOIN "CampaignParticipant" cp ON cpds."participantId" = cp.id
  JOIN "Contact" c ON cp."contactId" = c.id
  JOIN "Campaign" camp ON cp."campaignId" = camp.id
  JOIN "WaTemplate" wt ON wt.id = $1
  JOIN LATERAL (
      SELECT *
      FROM "WhatsappSettings" was
      WHERE was."orgId" = c."orgId"
        AND (
          wt."whatsappSettingsPhoneId" IS NULL
          OR was."phoneId" = wt."whatsappSettingsPhoneId"
        )
      ORDER BY 
        CASE WHEN was."phoneId" = wt."whatsappSettingsPhoneId" THEN 0 ELSE 1 END,
        was."phoneId"
      LIMIT 1
  ) was ON TRUE
  LEFT JOIN "ContactCustomFieldValue" ccfv ON ccfv."contactId" = c.id
  LEFT JOIN "ContactCustomField" ccf ON ccf.id = ccfv."fieldId"
  WHERE cpds."dripStageId" = $2
  AND camp.id = $3
`;

    const params: any[] = [dripStage.waTemplateId, dripStageId, campaignId];
    let paramIndex = 4;

    if (participantId) {
      query += ` AND cpds."participantId" = $${paramIndex}`;
      params.push(participantId);
      paramIndex++;
    } else {
      // A named cohort and the status filter both apply, unlike the single
      // participant above which is already an exact row. The drip cron sends the
      // participants whose delay has elapsed, and they still have to be PENDING —
      // dropping either half would send to everyone on the stage, which is the
      // behaviour the per-participant scheduling replaced.
      if (participantIds?.length) {
        query += ` AND cpds."participantId" = ANY($${paramIndex}::uuid[])`;
        params.push(participantIds);
        paramIndex++;
      }
      if (sendToStatuses?.length) {
        query += ` AND cpds.status = ANY($${paramIndex})`;
        params.push(sendToStatuses);
        paramIndex++;
      }
    }

    if (campaign?.useUserConsent) {
      query += ` AND c.consent = true`;
    }

    // `json_agg` over the custom fields makes this an aggregate query, so every
    // other selected column has to be grouped. Ordering is deterministic so a
    // participant keeps its position -- and therefore its daily-send batch --
    // across the drip cron's repeated re-enqueues of the same stage.
    query += `
  GROUP BY
    cpds.id, cp.id, c.id, camp.id, wt.id, was."accessToken", was."phoneId", was."phone", was."accessToken_iv"
  ORDER BY cpds."createdAt", cpds.id
`;

    const participants = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return participants;
  }

  // If dripStageId is not present, use original query
  // First fetch campaign settings to check consent requirement
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { useUserConsent: true },
  });

  let query = `
  SELECT 
    cp.id,
    c.phone,
    c.name,
    c."orgId",
    c.id as "contactId",
    camp."dynamicTags",
    camp."teamId",
    wt.data,
    wt."defaultValues",
    camp.id as "campaignId",
    was."accessToken",
    was."phoneId",
    was."phone" as "sourceIdentifier",
    was."accessToken_iv",
    COALESCE(
      json_agg(
        json_build_object(
          'slug', ccf.slug,
          'value', ccfv.value
        )
      ) FILTER (WHERE ccfv.id IS NOT NULL),
      '[]'
    ) AS "customFields"
  FROM "CampaignParticipant" cp
  JOIN "Contact" c ON cp."contactId" = c.id
  JOIN "Campaign" camp ON cp."campaignId" = camp.id
  JOIN "WaTemplate" wt ON camp."waTemplateId" = wt.id
  JOIN LATERAL (
    SELECT *
    FROM "WhatsappSettings" was
    WHERE was."orgId" = c."orgId"
      AND (
        wt."whatsappSettingsPhoneId" IS NULL
        OR was."phoneId" = wt."whatsappSettingsPhoneId"
      )
    ORDER BY 
      CASE WHEN was."phoneId" = wt."whatsappSettingsPhoneId" THEN 0 ELSE 1 END,
      was."phoneId"
    LIMIT 1
  ) was ON TRUE
  LEFT JOIN "ContactCustomFieldValue" ccfv ON ccfv."contactId" = c.id
  LEFT JOIN "ContactCustomField" ccf ON ccf.id = ccfv."fieldId"
    WHERE cp."campaignId" = $1
`;

  const params: any[] = [campaignId];
  let paramIndex = 2;
  // An exact cohort replaces the status filter rather than narrowing it. Both
  // are ways of saying *who*, and the caller that names people has already
  // decided: "Retry now" on one recipient means that recipient, whatever the
  // status column says at the moment the job runs. `participantIds` used to be
  // ANDed with the statuses, so a named recipient the status filter did not also
  // match was dropped from the fan-out with nothing said anywhere.
  if (participantId) {
    query += ` AND cp.id = $${paramIndex}`;
    params.push(participantId);
    paramIndex++;
  } else if (participantIds?.length) {
    query += ` AND cp.id = ANY($${paramIndex}::uuid[])`;
    params.push(participantIds);
    paramIndex++;
  } else if (sendToStatuses?.length) {
    query += ` AND cp.status = ANY($${paramIndex})`;
    params.push(sendToStatuses);
    paramIndex++;
  }

  if (campaign?.useUserConsent) {
    query += ` AND c.consent = true`;
  }
  query += `
  GROUP BY
    cp.id, c.id, camp.id, wt.id, was."accessToken", was."phoneId", was."phone", was."accessToken_iv"
  ORDER BY cp."createdAt", cp.id
`;
  const participants = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  return participants;
}

/**
 * Extract the survey team map ID if a flow ID is present in template components
 * @param components Template components
 * @param teamId Team ID
 * @returns Survey team map ID or null if not found
 */
export async function getSurveyTeamMapId(
  components: any[],
  teamId: string,
): Promise<string | null> {
  const flowId = getFlowIdFromTemplateComponents(components);

  if (!flowId || !teamId) {
    return null;
  }

  // Query to get the survey team mapping
  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: { teamId, survey: { WaFlow: { flowId } } },
    select: { id: true },
  });

  return surveyTeamMap?.id || null;
}

/**
 * Decrypt WhatsApp access token
 * @param encryptedToken Encrypted access token
 * @param iv Initialization vector
 * @returns Decrypted token
 */
export async function decryptAccessToken(encryptedToken: string, iv: string): Promise<string> {
  if (!encryptedToken || !iv) {
    // The usual cause is a team with no WhatsApp settings row: the participant
    // query LEFT JOINs the credentials, so they come back null rather than
    // failing the query. Say which, since this message is what the sender sees
    // on the failed campaign.
    throw new Error("This team has no connected WhatsApp number, so nothing could be sent.");
  }

  // Matches the guard in wa_settings.service.ts. Without it a missing key
  // reaches Buffer.from as undefined and throws about argument types, which
  // says nothing about the configuration that is actually missing.
  const key = process.env.wa_access_token_encryption_key;
  if (!key) {
    throw new Error("wa_access_token_encryption_key is not configured");
  }

  return aes_decrypt(encryptedToken, Buffer.from(key, "hex"), iv);
}

/**
 * Execute all bulk database updates within a transaction
 */
export async function executeBulkUpdates(
  campaignParticipantUpdates: any[],
  messageLogUpdates: any[],
  campaignStatsUpdates: any[],
  waMessageUpdates: any[],
  dripCampaignParticipantUpdates: any[] = [],
  dripCampaignStatsUpdates: any[] = [],
  /**
   * Rows of [waMessageId, meteredConversationId | null, category | null,
   * pricingModel | null, billable | null, pricingType | null] — Meta's per-message
   * pricing signals. Informational only: Meta bills the customer's WABA directly, so
   * nothing here gates metering or enforcement.
   */
  pricingUpdates: any[] = [],
  /**
   * Rows of [sent, read, delivered, complete, failed, campaignSendId] — the same
   * `diffStatusData` deltas that feed `campaignStatsUpdates`, applied to the send
   * session the message belonged to. Sharing the deltas is what keeps the
   * per-attempt totals and the campaign lifetime totals from disagreeing.
   */
  campaignSendStatsUpdates: any[] = [],
): Promise<void> {
  // Raw `pg` rather than `prisma.$transaction`, for a different reason than the
  // campaign dispatch path: this transaction is not starved of a connection, it
  // simply takes longer than Prisma allows. An interactive transaction is capped
  // at 5s, and a status batch — six multi-row updates whose VALUES lists are as
  // long as the Kafka batch — regularly runs past that, at which point Prisma
  // throws P2028 and the entire batch is discarded and republished for retry,
  // adding load to the thing that was already too slow. A `pg` transaction has no
  // client-side deadline. See `src/utils/db.ts`.
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    // Bulk update CampaignParticipant
    if (campaignParticipantUpdates.length) {
      const values = campaignParticipantUpdates
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(", ");
      const flat = campaignParticipantUpdates.flat();
      await client.query(
        `UPDATE "CampaignParticipant" AS cp SET
        status = v.status,
        "errorMessage" = CASE WHEN v.status = 'FAILED' THEN v.errorMessage ELSE NULL END,
        "sentAt" = CASE 
          WHEN v.sentAt IS NOT NULL AND v.sentAt <> '' 
          THEN v.sentAt::timestamp 
          ELSE cp."sentAt" 
        END
        FROM (VALUES ${values}) AS v(status, errorMessage, sentAt, id)
        WHERE cp.id = v.id::uuid`,
        flat,
      );
    }

    // Bulk update dripCampaignParticipantUpdates
    if (dripCampaignParticipantUpdates.length) {
      const values = dripCampaignParticipantUpdates
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(", ");
      const flat = dripCampaignParticipantUpdates.flat();
      await client.query(
        `UPDATE "CampaignParticipantDripStage" AS cp SET
        status = v.status,
        "errorMessage" = CASE WHEN v.status = 'FAILED' THEN v.errorMessage ELSE NULL END,
        "sentAt" = CASE 
          WHEN v.sentAt IS NOT NULL AND v.sentAt <> '' 
          THEN v.sentAt::timestamp 
          ELSE cp."sentAt" 
        END
        FROM (VALUES ${values}) AS v(status, errorMessage, sentAt, id)
        WHERE cp.id = v.id::uuid`,
        flat,
      );
    }

    // messageLogUpdates entries are [messageId, logs, errorCode]: the failure
    // detail is recorded on the message itself, with Meta's code lifted out of
    // the jsonb into its own column so retry eligibility and the failure
    // breakdown are indexable rather than jsonb path scans.
    if (messageLogUpdates.length) {
      const waMessageLogsUpdates = messageLogUpdates
        .filter(([messageId, logs]) => messageId && logs)
        .map(([messageId, logs, errorCode]) => [
          JSON.stringify(logs),
          typeof errorCode === "number" ? errorCode : null,
          messageId,
        ]);

      if (waMessageLogsUpdates.length) {
        const values = waMessageLogsUpdates
          .map((_, i) => `($${i * 3 + 1}::jsonb, $${i * 3 + 2}::int, $${i * 3 + 3})`)
          .join(", ");
        const flat = waMessageLogsUpdates.flat();

        await client.query(
          // COALESCE, not assignment: a status arriving after the failure (a
          // late `delivered` on a different attempt's row, say) carries no code
          // and must not erase the one already recorded.
          `UPDATE "WaMessage" AS wm
           SET logs = v.logs,
               "errorCode" = COALESCE(v."errorCode", wm."errorCode")
           FROM (VALUES ${values}) AS v(logs, "errorCode", messageId)
           WHERE wm."messageId" = v.messageId`,
          flat,
        );
      }
    }

    // Persist Meta's per-message pricing onto the message, then promote it onto the
    // metered window that message belongs to.
    if (pricingUpdates.length) {
      const values = pricingUpdates
        .map(
          (_, i) =>
            `($${i * 6 + 1}::uuid, $${i * 6 + 2}::uuid, $${i * 6 + 3}::"WaConversationCategory", ` +
            `$${i * 6 + 4}::"WaPricingModel", $${i * 6 + 5}::boolean, $${i * 6 + 6})`,
        )
        .join(", ");
      const flat = pricingUpdates.flat();

      await client.query(
        `UPDATE "WaMessage" AS wm SET
        "pricingCategory" = v.category,
        "pricingModel" = v."pricingModel",
        "pricingBillable" = v.billable,
        "pricingType" = v."pricingType"
        FROM (VALUES ${values}) AS v(id, "meteredConversationId", category, "pricingModel", billable, "pricingType")
        WHERE wm.id = v.id`,
        flat,
      );

      // Annotates the window the message was attributed to when it was written —
      // NOT whichever window is open now. A status can arrive long after its
      // message (a `delivered` landing 35h later is real), by which time a
      // different window is current.
      //
      // `billable` only ever promotes to true: one window can hold both a free
      // service message and a charged template, and the window is billable if any
      // message in it was.
      await client.query(
        `UPDATE "MeteredConversation" AS mc SET
        category = COALESCE(v.category, mc.category),
        "pricingModel" = COALESCE(v."pricingModel", mc."pricingModel"),
        "pricingType" = COALESCE(v."pricingType", mc."pricingType"),
        billable = mc.billable OR COALESCE(v.billable, false)
        FROM (VALUES ${values}) AS v(id, "meteredConversationId", category, "pricingModel", billable, "pricingType")
        WHERE mc.id = v."meteredConversationId"`,
        flat,
      );
    }

    // Bulk update CampaignStats
    if (campaignStatsUpdates.length) {
      const values = campaignStatsUpdates
        .map(
          (_, i) =>
            `($${i * 6 + 1}::int, $${i * 6 + 2}::int, $${i * 6 + 3}::int, $${
              i * 6 + 4
            }::int, $${i * 6 + 5}::int, $${i * 6 + 6})`,
        )
        .join(", ");
      const flat = campaignStatsUpdates.flat();
      await client.query(
        `UPDATE "CampaignStats" AS cs SET
          "totalSend" = cs."totalSend" + v.sent,
          "totalRead" = cs."totalRead" + v.read,
          "totalDelivered" = cs."totalDelivered" + v.delivered,
          "totalCompleted" = cs."totalCompleted" + v.complete,
          "totalFailed" = cs."totalFailed" + v.failed
        FROM (VALUES ${values}) AS v(sent, read, delivered, complete, failed, campaignId)
        WHERE cs."campaignId" = v.campaignId::uuid`,
        flat,
      );
    }

    // Bulk update CampaignSend — the same deltas as CampaignStats above, but
    // attributed to the attempt that produced them. This is what makes "this
    // retry re-attempted 340 and 210 landed" answerable.
    if (campaignSendStatsUpdates.length) {
      const values = campaignSendStatsUpdates
        .map(
          (_, i) =>
            `($${i * 6 + 1}::int, $${i * 6 + 2}::int, $${i * 6 + 3}::int, $${
              i * 6 + 4
            }::int, $${i * 6 + 5}::int, $${i * 6 + 6})`,
        )
        .join(", ");
      const flat = campaignSendStatsUpdates.flat();
      await client.query(
        `UPDATE "CampaignSend" AS cs SET
          "totalSent" = cs."totalSent" + v.sent,
          "totalRead" = cs."totalRead" + v.read,
          "totalDelivered" = cs."totalDelivered" + v.delivered,
          "totalCompleted" = cs."totalCompleted" + v.complete,
          "totalFailed" = cs."totalFailed" + v.failed
        FROM (VALUES ${values}) AS v(sent, read, delivered, complete, failed, id)
        WHERE cs."id" = v.id::uuid`,
        flat,
      );
    }

    // Bulk update dripCampaignStatsUpdates
    if (dripCampaignStatsUpdates.length) {
      const values = dripCampaignStatsUpdates
        .map(
          (_, i) =>
            `($${i * 6 + 1}::int, $${i * 6 + 2}::int, $${i * 6 + 3}::int, $${
              i * 6 + 4
            }::int, $${i * 6 + 5}::int, $${i * 6 + 6})`,
        )
        .join(", ");
      const flat = dripCampaignStatsUpdates.flat();
      await client.query(
        `UPDATE "CampaignDripStage" AS cs SET
          "totalSend" = cs."totalSend" + v.sent,
          "totalRead" = cs."totalRead" + v.read,
          "totalDelivered" = cs."totalDelivered" + v.delivered,
          "totalCompleted" = cs."totalCompleted" + v.complete,
          "totalFailed" = cs."totalFailed" + v.failed
        FROM (VALUES ${values}) AS v(sent, read, delivered, complete, failed, id)
        WHERE cs."id" = v.id::uuid`,
        flat,
      );
    }

    // Bulk update WaMessage
    if (waMessageUpdates.length) {
      const values = waMessageUpdates
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(", ");
      const flat = waMessageUpdates.flat();
      await client.query(
        `UPDATE "WaMessage" AS wm SET
          stats = v.stats::jsonb,
          "errorMessage" = CASE WHEN v.status = 'FAILED' THEN v.errorMessage ELSE NULL END
        FROM (VALUES ${values}) AS v(stats, status, errorMessage, id)
        WHERE wm.id = v.id::uuid`,
        flat,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    // A failed ROLLBACK (the connection itself died) must not mask the original
    // error, which is the one that explains the failure.
    await client.query("ROLLBACK").catch(() => {});
    log.error("Error performing bulk updates: %o", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Interfaces for data processing and database operations
 */
export interface MessageStats {
  read: string;
  sent: string;
  failed: string;
  delivered: string;
  completed?: string;
}

interface RedisStatus {
  [key: string]: string | undefined;
  status?: string;
}

interface CampaignParticipant {
  id: string;
  campaignId: string;
  status: string;
}

interface WaMessage {
  id: string;
  stats: MessageStats;
}

interface MessageParticipantResult {
  msg: WaMessage;
  campaignParticipant: CampaignParticipant;
  contactOrgId?: string;
  contactPhone?: string;
}

/**
 * Process Redis status data and update message stats
 * @param messageStats Current message stats
 * @param redisData Redis status data
 * @returns Updated message stats and status info
 */
export function processStatusUpdates(
  messageStats: MessageStats,
  redisData: RedisStatus,
): { stats: MessageStats; newStatus: string } {
  // Initialize stats if they don't exist
  const stats = messageStats || {
    read: "",
    sent: "",
    failed: "",
    delivered: "",
  };

  // Update stats only if the Redis data exists and stats field is empty
  if (redisData["sent"] && !stats.sent) stats.sent = redisData["sent"];
  if (redisData["delivered"] && !stats.delivered) stats.delivered = redisData["delivered"];
  if (redisData["read"] && !stats.read) stats.read = redisData["read"];
  if (redisData["failed"] && !stats.failed) stats.failed = redisData["failed"];

  // Determine the message status based on Redis counts
  let newStatus = "";
  if (redisData["complete"]) newStatus = "COMPLETED";
  else if (redisData["read"]) newStatus = "READ";
  else if (redisData["delivered"]) newStatus = "DELIVERED";
  else if (redisData["failed"]) newStatus = "FAILED";
  else if (redisData["sent"]) newStatus = "SENT";

  return { stats, newStatus };
}

/**
 * Generates a bulk update for campaign participants
 * @param campaignParticipantId Participant ID
 * @param status Status string
 * @param errorMessage Error message (optional)
 * @param sentTimestamp Sent timestamp
 * @returns Array of update parameters
 */
export function prepareCampaignParticipantUpdate(
  campaignParticipantId: string,
  status: string,
  errorMessage: string | null,
  sentTimestamp: string,
): any[] {
  return [status.toUpperCase(), errorMessage, sentTimestamp, campaignParticipantId];
}

/**
 * Generates a bulk update for message stats
 * @param messageId Message ID
 * @param stats Message stats object
 * @param status Status string
 * @param errorMessage Error message (optional)
 * @returns Array of update parameters
 */
export function prepareWaMessageUpdate(
  messageId: string,
  stats: MessageStats,
  status: string,
  errorMessage: string | null,
): any[] {
  return [stats, status.toUpperCase(), errorMessage, messageId];
}

/**
 * Updates campaign stats counters based on status
 * @param campaignStatsUpdates Current stats updates array
 * @param campaignId Campaign ID
 * @param redisData Redis status data
 * @returns Updated campaign stats updates array
 */
export function updateCampaignStatsCounters(
  campaignStatsUpdates: any[],
  campaignId: string,
  redisData: RedisStatus,
): any[] {
  if (!campaignId) return campaignStatsUpdates;

  const sent = redisData["sent"] ? 1 : 0;
  const read = redisData["read"] ? 1 : 0;

  // ensure delivered is not lower than read within this diff batch
  const delivered = redisData["delivered"] ? 1 : 0;

  // accept both 'complete' and 'completed'
  const completed = redisData["completed"] ? 1 : 0;

  const failed = redisData["failed"] ? 1 : 0;

  const existingStatsIndex = campaignStatsUpdates.findIndex((item) => item[5] === campaignId);

  if (existingStatsIndex === -1) {
    // Add new entry
    campaignStatsUpdates.push([sent, read, delivered, completed, failed, campaignId]);
  } else {
    // Add to existing counts
    campaignStatsUpdates[existingStatsIndex][0] += sent;
    campaignStatsUpdates[existingStatsIndex][1] += read;
    campaignStatsUpdates[existingStatsIndex][2] += delivered;
    campaignStatsUpdates[existingStatsIndex][3] += completed;
    campaignStatsUpdates[existingStatsIndex][4] += failed;
  }

  return campaignStatsUpdates;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: string,
  scheduledAt?: string | null,
  includeScheduledAt: boolean = false,
  /**
   * Why the campaign ended up in this status. Written whenever it is given —
   * including as `null`, which is how a fresh send clears the last failure.
   */
  errorMessage?: string | null,
) {
  return await prisma.campaign.updateMany({
    where: { id: campaignId },
    data: {
      status,
      // `includeScheduledAt` is how a failure clears the scheduled time: it asks
      // for the column to be written even when the value is null.
      ...(scheduledAt || includeScheduledAt
        ? { campaignSentAt: scheduledAt ? new Date(scheduledAt) : null }
        : {}),
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    },
  });
}

function safeParseJSON<T = any>(value: unknown): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return value as T;
  } catch {
    return undefined;
  }
}

/**
 * `WaMessage.sourceMessage` is the `messageType` handleWaMessages was given, and
 * campaign sends pass "CAMPAIGN". Compared loosely: the column is free text and
 * older rows were written by a dispatcher that spelled it in lowercase.
 */
function isCampaignMessage(sourceMessage: string | null | undefined): boolean {
  return String(sourceMessage ?? "").toLowerCase() === "campaign";
}

export async function bulkUpdateStatuses(
  batch: {
    id: string;
    value: {
      status: string;
      messageId: string;
      errors?: any;
      timestamp?: string;
      pricing?: WaStatusPricing;
    };
  }[],
): Promise<string[]> {
  console.log("Received batch of size:", batch.length);
  // Parse and group by messageId
  interface Entry {
    id: string;
    messageId: string;
    status: string;
    timestamp?: string;
    errors?: any;
    pricing?: WaStatusPricing;
  }
  const parsed: Entry[] = [];
  for (const { id, value } of batch) {
    const obj = value;
    if (!obj.messageId || !obj.status) continue;
    parsed.push({
      id,
      messageId: obj.messageId,
      status: String(obj.status).toLowerCase(),
      timestamp: obj.timestamp,
      errors: safeParseJSON(obj.errors),
      pricing: obj.pricing,
    });
  }

  if (!parsed.length) {
    log.trace("No valid WA status entries after parsing");
    return [];
  }

  // Aggregate per messageId to a structure compatible with processStatusUpdates
  const byMessageId = new Map<
    string,
    { ackIds: string[]; redisData: Record<string, string>; pricing?: WaStatusPricing }
  >();
  for (const ev of parsed) {
    const agg = byMessageId.get(ev.messageId) || {
      ackIds: [],
      redisData: {} as Record<string, string>,
      pricing: undefined as WaStatusPricing | undefined,
    };
    agg.ackIds.push(ev.id);
    // Every status for a message reports the same pricing, and some omit it — keep
    // the first one seen rather than letting a later bare status blank it out.
    if (!agg.pricing && ev.pricing) agg.pricing = ev.pricing;

    const ts = ev.timestamp || new Date().toISOString();
    // First-write-wins per status timestamp
    if (!agg.redisData[ev.status]) {
      agg.redisData[ev.status] = ts;
      // Normalize 'complete'/'completed' mismatch
      if (ev.status === "completed" && !agg.redisData["complete"]) {
        agg.redisData["complete"] = ts;
      }
      if (ev.status === "complete" && !agg.redisData["completed"]) {
        agg.redisData["completed"] = ts;
      }
    }
    if (ev.errors) {
      agg.redisData["lastError"] = JSON.stringify(ev.errors);
    }
    byMessageId.set(ev.messageId, agg);
  }

  const messageIds = Array.from(byMessageId.keys());
  if (!messageIds.length) {
    log.trace("No message IDs found for stream batch");
    return [];
  }
  // Fetch DB data (reuse existing query, join campaign/drip info)
  const messageData = await prisma.$queryRaw<any[]>`
          SELECT 
            wm.id AS "messageId",
            wm.stats,
            wm."messageId" AS "externalMessageId",
            wm."sourceIdentifier",
            wm."sourceMessage",
            wm."meteredConversationId",
            cp.id AS "participantId",
            cp."campaignId",
            cp.status AS "participantStatus",
            c.phone AS "contactPhone",
            c."orgId" AS "contactOrgId",
            c."id" AS "contactId",
            wmcpm."campaignParticipantDripStageId",
            wmcpm."campaignSendId",
            cpds."dripStageId" AS "dripStageId",
            cpds.status AS "dripStageStatus"
          FROM "WaMessage" wm
          LEFT JOIN "WaMessageCampaginParticipantMap" wmcpm ON wm.id = wmcpm."waMessageId"
          LEFT JOIN "CampaignParticipant" cp ON wmcpm."campaignParticipantId" = cp.id
          LEFT JOIN "Contact" c ON wm."contactId" = c.id
          LEFT JOIN "CampaignParticipantDripStage" cpds ON wmcpm."campaignParticipantDripStageId" = cpds.id
          WHERE wm."messageId" = ANY(${messageIds})
        `;

  if (!messageData.length) {
    log.trace("No matching message records found for stream batch");
    return [];
  }

  const messageDataMap = new Map<
    string,
    {
      msg: { id: string; stats: any };
      campaignParticipant: {
        id: string;
        campaignId: string;
        status: string;
        dripStageId: string | null;
        campaignParticipantDripStageId: string | null;
      };
      campaignSendId?: string | null;
      contactOrgId?: string;
      contactPhone?: string;
      contactId?: string;
      sourceIdentifier?: string;
      sourceMessage?: string | null;
      meteredConversationId?: string | null;
    }
  >();
  for (const row of messageData) {
    if (row.externalMessageId) {
      messageDataMap.set(row.externalMessageId, {
        msg: {
          id: row.messageId,
          stats: row.stats || {
            read: "",
            sent: "",
            failed: "",
            delivered: "",
          },
        },
        campaignParticipant: {
          id: row.participantId || "",
          campaignId: row.campaignId || "",
          status: row?.dripStageStatus || row.participantStatus || "",
          dripStageId: row?.dripStageId || null,
          campaignParticipantDripStageId: row?.campaignParticipantDripStageId || null,
        },
        campaignSendId: row.campaignSendId || null,
        contactOrgId: row.contactOrgId,
        contactPhone: row.contactPhone,
        contactId: row.contactId,
        sourceIdentifier: row.sourceIdentifier,
        sourceMessage: row.sourceMessage,
        meteredConversationId: row.meteredConversationId,
      });
    }
  }

  const campaignParticipantUpdates: any[] = [];
  const messageLogUpdates: any[] = [];
  const campaignStatsUpdates: any[] = [];
  const campaignSendStatsUpdates: any[] = [];
  const waMessageUpdates: any[] = [];
  const pricingUpdates: any[] = [];
  const dripCampaignParticipantUpdates: any[] = [];
  const dripCampaignStatsUpdates: any[] = [];

  const processedOffsets: string[] = [];

  for (const [externalMessageId, agg] of byMessageId.entries()) {
    const messageInfo = messageDataMap.get(externalMessageId);
    if (!messageInfo) continue;

    const { msg, campaignParticipant, contactOrgId, contactPhone, sourceIdentifier } = messageInfo;

    // A campaign message with no participant behind it is one whose link has
    // not been written yet, not an ad-hoc send. Processing it now would write
    // the message's own stats and ack the offset while every campaign-side
    // update below is skipped for want of a campaignId — and the next receipt
    // finds `sent` already stored, so the counter is never caught up. Leaving it
    // unacked sends it round the retry loop until the link exists.
    if (
      isCampaignMessage(messageInfo.sourceMessage) &&
      !campaignParticipant.id &&
      !campaignParticipant.campaignParticipantDripStageId
    ) {
      continue;
    }

    // Backfill logical prerequisite statuses
    const { redisData } = agg;
    const hasStoredSent = !!msg.stats?.sent;
    const hasStoredDelivered = !!msg.stats?.delivered;

    const getTimestamp = (primary?: string, fallback?: string) =>
      primary || fallback || new Date().toISOString();

    if (!redisData.sent && !hasStoredSent) {
      if (redisData.delivered || redisData.read || redisData.error || redisData.failed) {
        redisData.sent = getTimestamp(
          redisData.delivered,
          redisData.read || redisData.error || redisData.failed,
        );
      }
    }
    if (redisData.read && !redisData.delivered && !hasStoredDelivered) {
      redisData.delivered = getTimestamp(redisData.read);
    }

    // Determine which statuses are NEW (transitioned this batch) for stats counting
    const diffStatusData: Record<string, string> = {};
    const statusKeys = ["sent", "delivered", "read", "failed", "completed"];
    for (const k of statusKeys) {
      if (redisData[k] && !msg?.stats?.[k]) {
        diffStatusData[k] = redisData[k];
      }
    }

    const { stats, newStatus } = processStatusUpdates(msg.stats, redisData);
    if (messageInfo.contactOrgId) {
      publisher.publish(
        "ws:messages",
        JSON.stringify({
          orgId: messageInfo.contactOrgId,
          data: {
            type: "message_status_update",
            message_status_update: {
              stats: stats,
              contactId: messageInfo?.contactId,
              messageId: externalMessageId,
              sourceIdentifier,
            },
          },
          roleFilter: "main",
        }),
      );
    }

    const lastErr = safeParseJSON<any>(redisData.lastError);
    // `title` is only sometimes present on a Meta status error, so reading it
    // alone left real failures stored with a null reason. Fall through the
    // fields Meta actually populates before giving up.
    const errorMsg = lastErr?.[0] ? metaErrorMessage(lastErr[0]) : null;

    if (campaignParticipant?.campaignParticipantDripStageId) {
      dripCampaignParticipantUpdates.push(
        prepareCampaignParticipantUpdate(
          campaignParticipant.campaignParticipantDripStageId,
          newStatus || "",
          errorMsg,
          stats.sent,
        ),
      );
    } else if (campaignParticipant.id) {
      campaignParticipantUpdates.push(
        prepareCampaignParticipantUpdate(
          campaignParticipant.id,
          newStatus || "",
          errorMsg,
          stats.sent,
        ),
      );
    }

    if (lastErr) {
      try {
        const detail = lastErr?.[0] ?? {};
        messageLogUpdates.push([
          externalMessageId,
          detail,
          typeof detail?.code === "number" ? detail.code : null,
        ]);
      } catch (e) {
        log.error("Failed to record message logs: %o", e);
      }
    }

    // Use ONLY diffStatusData for stats counters to avoid double counting
    if (Object.keys(diffStatusData).length && campaignParticipant.campaignId) {
      updateCampaignStatsCounters(
        campaignStatsUpdates,
        campaignParticipant.campaignId,
        diffStatusData,
      );
    }

    if (Object.keys(diffStatusData).length && messageInfo.campaignSendId) {
      updateCampaignStatsCounters(
        campaignSendStatsUpdates,
        messageInfo.campaignSendId,
        diffStatusData,
      );
    }

    if (Object.keys(diffStatusData).length && campaignParticipant.dripStageId) {
      updateCampaignStatsCounters(
        dripCampaignStatsUpdates,
        campaignParticipant.dripStageId,
        diffStatusData,
      );
    }

    waMessageUpdates.push(prepareWaMessageUpdate(msg.id, stats, newStatus || "", errorMsg));

    if (agg.pricing) {
      pricingUpdates.push([
        msg.id,
        messageInfo.meteredConversationId ?? null,
        normalizePricingCategory(agg.pricing.category),
        normalizePricingModel(agg.pricing.pricing_model),
        agg.pricing.billable ?? null,
        agg.pricing.type ?? null,
      ]);
    }

    processedOffsets.push(...agg.ackIds);
  }

  if (
    !campaignParticipantUpdates.length &&
    !dripCampaignParticipantUpdates.length &&
    !messageLogUpdates.length &&
    !campaignStatsUpdates.length &&
    !campaignSendStatsUpdates.length &&
    !dripCampaignStatsUpdates.length &&
    !waMessageUpdates.length &&
    !pricingUpdates.length
  ) {
    return processedOffsets;
  }

  await executeBulkUpdates(
    campaignParticipantUpdates,
    messageLogUpdates,
    campaignStatsUpdates,
    waMessageUpdates,
    dripCampaignParticipantUpdates,
    dripCampaignStatsUpdates,
    pricingUpdates,
    campaignSendStatsUpdates,
  );

  return processedOffsets;
}

export function createTextMessage(to: string, title: string, description = ""): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body:
        (title ? `*${title}*\n\n` : "") +
        `${typeof description === "string" ? description : parseToWhatsAppFormat(description)}`,
    },
  };
}

function formatText(text: string, type = "*") {
  let trimmedEnd = text.trimEnd();
  let trimmedStart = text.trimStart();
  let trimmed = text.trim();

  let leadingSpaces = " ".repeat(text.length - trimmedStart.length);
  let trailingSpaces = " ".repeat(text.length - trimmedEnd.length);
  return `${leadingSpaces}${type}${trimmed}${type}${trailingSpaces}`;
}
export function parseToWhatsAppFormat(editorContent: any) {
  if (!editorContent) return "";
  const parseNode = (node: any): string => {
    if (!node) return "";
    switch (node.type) {
      case "paragraph":
        return node?.content?.map(parseNode).join("");
      case "text": {
        let text = node.text;
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case "bold":
                text = formatText(text, "*");
                break;
              case "italic":
                text = formatText(text, "_");
                break;
              case "strike":
                text = formatText(text, "~");
                break;
              case "code":
                text = `\`${text}\``;
                break;
              default:
                break;
            }
          });
        }
        return text;
      }
      case "bulletList":
        return node.content.map((item: any) => `* ${parseNode(item)}`).join("\n");
      case "orderedList":
        return node.content
          .map((item: any, index: number) => `${index + 1}. ${parseNode(item)}`)
          .join("\n");
      case "blockquote":
        return node.content.map((item: any) => `> ${parseNode(item)}`).join("\n");
      case "codeBlock":
        return `\`\`\`${node.content.map(parseNode).join("")}\`\`\``;
      case "listItem":
        return node.content.map(parseNode).join("");
      default:
        return "";
    }
  };

  return editorContent?.content
    ? editorContent.content.map(parseNode).join("\n")
    : editorContent.map(parseNode).join("\n");
}
