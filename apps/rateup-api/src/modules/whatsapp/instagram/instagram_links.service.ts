import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";

/** How often one ig.me link's ref was opened, and by how many people. */
export interface InstagramLinkStats {
  ref: string;
  /** Inbound events that carried the ref: a first message, an ice breaker tap, or a reopen. */
  opens: number;
  people: number;
  lastOpenedAt: Date;
}

/**
 * Opens per ig.me ref for one Instagram account, read off the inbound messages that carried
 * the link's referral. Meta delivers it three ways and they are stored as received:
 * `receive.referral` (an existing thread reopened, or an ice breaker postback) and
 * `receive.message.referral` (a new thread's first message).
 */
export async function getInstagramLinkStats(ibaId: string): Promise<InstagramLinkStats[]> {
  const rows = await prisma.$queryRaw<
    { ref: string; opens: number; people: number; lastOpenedAt: Date }[]
  >(Prisma.sql`
    SELECT ref,
           COUNT(*)::INTEGER AS "opens",
           COUNT(DISTINCT "contactId")::INTEGER AS "people",
           MAX("createdAt") AS "lastOpenedAt"
    FROM (
      SELECT COALESCE(
               "messageBody" #>> '{receive,referral,ref}',
               "messageBody" #>> '{receive,message,referral,ref}'
             ) AS ref,
             "contactId",
             "createdAt"
      FROM "WaMessage"
      WHERE "sourceIdentifier" = ${ibaId}
        AND "sourcePlatform" = 'INSTAGRAM'
    ) opened
    WHERE ref IS NOT NULL AND ref <> ''
    GROUP BY ref
  `);
  return rows;
}
