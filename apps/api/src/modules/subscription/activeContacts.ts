import type { PlatformType } from "../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { getActiveContactAllowance } from "./addons.js";
import { currentPeriodStart, isSamePeriod, periodKey } from "./billingPeriod.js";
import { maybeNotifyLimitReached } from "./limitAlerts.js";

/** WhatsApp ids reach here with and without `+` and separators; digits are the one form. */
export function normalizeCustomerId(platform: PlatformType, customerId: string): string {
  if (platform !== "WHATSAPP") return customerId;
  return customerId.replace(/\D/g, "") || customerId;
}

export interface RecordActiveContactInput {
  orgId: string;
  platform: PlatformType;
  customerId: string;
  contactId?: string | null;
  at: Date;
  direction: "send" | "receive";
  /** A campaign send. Broadcasts never make a contact active on their own. */
  isBroadcast: boolean;
}

/**
 * Counts the contact as active for the month, once.
 *
 * The insert is the meter: the unique (org, period, contactKey) makes concurrent messages
 * to one contact collapse into one row, and only the statement that created it ticks the
 * counter. Best-effort like the conversation meter — a failure here must not cost the
 * customer their message.
 */
export async function recordActiveContact(input: RecordActiveContactInput): Promise<void> {
  if (input.direction === "send" && input.isBroadcast) return;

  const { orgId, platform, at } = input;
  const customerId = normalizeCustomerId(platform, input.customerId);
  const contactKey = input.contactId ?? `${platform}:${customerId}`;
  const period = currentPeriodStart(at);

  try {
    const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "ActiveContact" (
        "orgId", "periodStart", "contactKey", "contactId", "platform", "customerId",
        "firstActiveAt", "reason"
      ) VALUES (
        ${orgId}::uuid, ${periodKey(period)}::date, ${contactKey}, ${input.contactId ?? null}::uuid,
        ${platform}::"PlatformType", ${customerId}, ${at},
        ${input.direction === "receive" ? "INBOUND" : "OUTBOUND"}::"ActiveContactReason"
      )
      ON CONFLICT ("orgId", "periodStart", "contactKey") DO NOTHING
      RETURNING "id"
    `;
    if (inserted.length === 0) return;

    // A counter left over from last month restarts at 1 instead of adding to it.
    const [usage] = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "UsageStats" ("orgId", "updatedAt", "activeContactsCount", "activeContactsPeriodStart")
      VALUES (${orgId}::uuid, now(), 1, ${periodKey(period)}::date)
      ON CONFLICT ("orgId") DO UPDATE SET
        "activeContactsCount" = CASE
          WHEN "UsageStats"."activeContactsPeriodStart" = ${periodKey(period)}::date
            THEN "UsageStats"."activeContactsCount" + 1
          ELSE 1
        END,
        "activeContactsPeriodStart" = ${periodKey(period)}::date,
        "updatedAt" = now()
      RETURNING "activeContactsCount" AS count
    `;

    const { effectiveMax } = await getActiveContactAllowance(orgId);
    if (effectiveMax !== undefined && usage.count >= effectiveMax) {
      await maybeNotifyLimitReached(orgId, "activeContacts", period);
    }
  } catch (error) {
    log.error({ err: error, orgId }, "Failed to record an active contact");
  }
}

export interface ActiveContactBudget {
  /** False when the plan does not cap active contacts (uncapped Enterprise). */
  metered: boolean;
  period: Date;
  used: number;
  /** Plan plus contact packs. Undefined when not metered. */
  max?: number;
  planMax?: number;
  addonContacts: number;
  remaining?: number;
  exhausted: boolean;
}

/**
 * Where the org stands against its active-contact allowance this month. The send gate,
 * the alert, the billing page and the staff console all read this, so they agree.
 */
export async function getActiveContactBudget(orgId: string): Promise<ActiveContactBudget> {
  const period = currentPeriodStart();
  const [usage, allowance] = await Promise.all([
    prisma.usageStats.findUnique({
      where: { orgId },
      select: { activeContactsCount: true, activeContactsPeriodStart: true },
    }),
    getActiveContactAllowance(orgId),
  ]);

  const used = isSamePeriod(usage?.activeContactsPeriodStart, period)
    ? (usage?.activeContactsCount ?? 0)
    : 0;
  const { planMax, addonContacts, effectiveMax: max } = allowance;

  if (max === undefined) {
    return { metered: false, period, used, addonContacts, exhausted: false };
  }
  return {
    metered: true,
    period,
    used,
    max,
    planMax,
    addonContacts,
    remaining: Math.max(max - used, 0),
    exhausted: used >= max,
  };
}

export interface Recipient {
  platform: PlatformType;
  /** wa_id / phone, igsId or psid — whatever the send is addressed to. */
  customerId: string;
}

/**
 * Whether the recipient already counts this month, so messaging them again costs nothing.
 *
 * Matches on the channel id the message was recorded under, or on the contact that id
 * belongs to — a contact who wrote in on Instagram is active when the business replies on
 * WhatsApp.
 */
export async function isContactActive(orgId: string, recipient: Recipient): Promise<boolean> {
  const period = currentPeriodStart();
  const customerId = normalizeCustomerId(recipient.platform, recipient.customerId);
  const rows = await prisma.$queryRaw<Array<{ hit: number }>>`
    SELECT 1 AS hit FROM "ActiveContact" ac
    WHERE ac."orgId" = ${orgId}::uuid
      AND ac."periodStart" = ${periodKey(period)}::date
      AND (
        (ac."platform" = ${recipient.platform}::"PlatformType" AND ac."customerId" = ${customerId})
        OR ac."contactId" IN (
          SELECT ci."contactId" FROM "ContactIdentity" ci
          WHERE ci."orgId" = ${orgId}::uuid
            AND ((ci."kind" = 'PHONE' AND ci."value" = ${recipient.customerId.replace(/\D/g, "")})
              OR (ci."kind" IN ('IG_SCOPED', 'FB_PSID') AND ci."value" = ${recipient.customerId}))
        )
      )
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Whether a non-broadcast send to this recipient is allowed: always while the allowance
 * has room, and once it is spent only to contacts already counted this month.
 */
export async function canMessageContact(orgId: string, recipient?: Recipient): Promise<boolean> {
  const budget = await getActiveContactBudget(orgId);
  if (!budget.exhausted) return true;
  if (!recipient) return false;
  return isContactActive(orgId, recipient);
}
