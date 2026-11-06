import prisma from "../../../utils/prisma.js";
import { storeBusinessPortfolio } from "../../whatsapp/settings/businessPortfolio.js";
import { getWaSettingsById } from "../../whatsapp/settings/wa_settings.service.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Stores the Meta business portfolio behind every connected WhatsApp number
 * (`WhatsappSettings.businessPortfolioId/Name`), one Graph call per WABA. New connections
 * store it themselves; this covers numbers connected before. A number whose token no
 * longer works is skipped and listed. Safe to re-run; it only looks at numbers without one.
 */
export async function backfillBusinessPortfolios({
  apply,
  log,
  timeLimitMs,
}: TaskContext): Promise<TaskOutcome> {
  const started = Date.now();
  const rows = await prisma.whatsappSettings.findMany({
    where: { businessPortfolioId: null, wabaId: { not: null } },
    select: { id: true, orgId: true, wabaId: true },
    orderBy: { createdAt: "asc" },
  });
  // One lookup per WABA: every number of a WABA shares its portfolio.
  const byWaba = new Map<string, (typeof rows)[number]>();
  for (const row of rows)
    if (row.wabaId && !byWaba.has(`${row.orgId}:${row.wabaId}`))
      byWaba.set(`${row.orgId}:${row.wabaId}`, row);

  let stored = 0;
  const failed: string[] = [];
  let finished = true;
  for (const row of byWaba.values()) {
    if (Date.now() - started > timeLimitMs) {
      finished = false;
      break;
    }
    if (!apply) continue;
    const settings = await getWaSettingsById(row.id, row.orgId).catch(() => null);
    const portfolio = settings?.accessToken
      ? await storeBusinessPortfolio(row.orgId, row.wabaId, settings.accessToken)
      : null;
    if (portfolio) {
      stored++;
      log(`WABA ${row.wabaId}: ${portfolio.name ?? portfolio.id}`);
    } else {
      failed.push(row.wabaId!);
      log(`WABA ${row.wabaId}: could not look up (token expired or no access)`);
    }
  }

  return {
    summary: apply
      ? `${stored} of ${byWaba.size} WhatsApp accounts given their business; ${failed.length} failed` +
        (finished ? "." : ". Stopped at the time limit — run again to continue.")
      : `${byWaba.size} WhatsApp accounts (${rows.length} numbers) have no business stored yet.`,
    details: { accounts: byWaba.size, numbers: rows.length, stored, failed, finished },
  };
}
