import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * One job per outbound campaign message.
 *
 * Three attempts with a five-second exponential backoff — the fast tier of the
 * retry story. A Meta 429 or a 5xx clears in seconds and does not deserve the
 * scheduled retry engine's 90-minute settle delay; a frequency cap does, and is
 * handled there instead.
 *
 * This only does anything because `waMessage.processor.ts` rethrows on a
 * transient failure. It swallows everything else deliberately, so a permanent
 * rejection does not burn three attempts and three times the latency to reach
 * the same answer. Same reasoning as `notificationQueue`'s `attempts: 5`, which
 * likewise works only because its processor throws.
 */
export const waMessageQueue = new Queue("waMessageQueue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
  },
});

// `wa-status-queue` and `wa-status-processor` used to be declared here. Neither
// ever had a consumer — the latter had a scheduler enqueueing one job a minute
// into a queue nobody read — so both were removed along with that scheduler.
// Delivery statuses are handled by the Kafka `status-events` consumer instead.

/** Ad-hoc single message sends and seeded inbox traffic. */
export const sendMessageQueue = new Queue("sendMessageQueue", { connection });

/**
 * Arguments to `handleWaMessages` for a message Meta has already accepted. The
 * positional signature is captured as a named object so it survives a trip
 * through Redis.
 */
export interface WaMessageRecordJob {
  payload: Record<string, unknown>;
  recipient: string;
  orgId: string;
  platform: string;
  sourceIdentifier: string | undefined;
  userName?: string;
  /** Always set: only accepted messages are queued here. */
  messageId: string;
  userId?: string;
  teamId: string | null;
  messageType: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW";
  isAutomated: boolean;
  externalApi: boolean;
  campaign?: {
    participantId: string;
    dripStageId?: string | null;
    templateData?: unknown;
    campaignSendId?: string | null;
  };
}

/**
 * The safety net under `sendMetaMessage`'s record step.
 *
 * A message that Meta accepted but whose row could not be written is the worst
 * outcome the send path can produce: the customer has it, the receipts are on
 * their way, and nothing in the database knows. On 2026-09-12 that was 2,800
 * campaign recipients stuck in PENDING, because the store failed on a starved
 * connection pool and its three in-process retries — seconds apart, in the same
 * starved process — failed the same way.
 *
 * So the retry now lives here, with real backoff and outside the process that
 * failed. Ten attempts from two seconds doubling reaches about half an hour,
 * long enough for a pool or a region blip to clear. The job id is the wamid so
 * a message is queued for recording at most once, and the processor checks for
 * an existing row before writing so a late first attempt cannot double-store.
 */
export const waMessageRecordQueue = new Queue<WaMessageRecordJob>("waMessageRecord", {
  connection,
  defaultJobOptions: {
    attempts: 10,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: true,
    removeOnFail: { count: 1000 },
  },
});

/** Queue a record job for an accepted message. Deduplicated on the wamid. */
export function enqueueWaMessageRecord(job: WaMessageRecordJob) {
  // "-", not ":": BullMQ 6 rejects a custom id with a colon unless it has exactly
  // three parts, which made every enqueue here throw.
  return waMessageRecordQueue.add("record", job, { jobId: `record-${job.messageId}` });
}
