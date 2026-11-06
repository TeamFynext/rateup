import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Spreadsheet contact imports, run on the worker instead of inside the upload request.
 *
 * The API parses and validates the file (a second or so even for 20k rows), parks the
 * valid rows in Redis under their own key and enqueues one job that only points at them.
 * The rows stay out of the job hash on purpose: the status endpoint reads the job on every
 * poll, and a 100k-row payload would ride along each time.
 *
 * The processor saves its progress after every batch, so a retried job resumes where the
 * failed attempt stopped rather than starting over (contactImport.service.ts).
 */
export const contactImportQueue = new Queue<ContactImportJobData, ContactImportProgress>(
  "contactImport",
  { connection },
);

/** A validated row: name, phone (digits, no plus) and one value per `fieldIds` entry. */
export type ContactImportRow = [name: string, phone: string, values: string[]];

export interface RejectedImportRow {
  name: string;
  phone: string;
}

export interface ContactImportJobData {
  orgId: string;
  contactGroupId?: string;
  updateExisting: boolean;
  /** Custom fields the file carries a column for, in the order of each row's `values`. */
  fieldIds: string[];
  /** Valid rows queued, after duplicates within the file were folded together. */
  total: number;
  /** Rows refused while validating — capped, with the full count beside it. */
  rejected: RejectedImportRow[];
  rejectedCount: number;
  /** Rows dropped because a later row in the same file had the same phone. */
  duplicateCount: number;
}

export interface ContactImportProgress {
  processed: number;
  created: number;
  updated: number;
  /** Already in the org and left as they were, because update-existing was off. */
  skipped: number;
  addedToGroup: number;
}

export const EMPTY_IMPORT_PROGRESS: ContactImportProgress = {
  processed: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  addedToGroup: 0,
};

// Long enough to outlive every retry; the processor deletes the key once it finishes.
const ROWS_TTL_SECONDS = 7 * 24 * 60 * 60;

export const contactImportRowsKey = (jobId: string) => `contactImport:${jobId}:rows`;

export async function enqueueContactImport(
  data: ContactImportJobData,
  rows: ContactImportRow[],
): Promise<string> {
  // No ':' — BullMQ rejects custom job ids containing its own key separator.
  const jobId = `contact-import-${randomUUID()}`;
  await connection.set(contactImportRowsKey(jobId), JSON.stringify(rows), "EX", ROWS_TTL_SECONDS);
  await contactImportQueue.add("import", data, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    // Kept a while so the dialog — or a reload of it — can still read the summary.
    removeOnComplete: { age: 24 * 60 * 60 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  });
  return jobId;
}
