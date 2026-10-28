import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { HttpError } from "../../../utils/http.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { getWaSettings } from "../settings/wa_settings.service.js";

/**
 * Per-template numbers from Meta's `template_analytics` edge: sent, delivered,
 * read, button clicks and cost. Clicks and cost are the reason this exists —
 * RateUp's own send log (Analytics → Messages) cannot see either.
 *
 * Meta's rules, from the Business Management API docs:
 * - The WhatsApp account must opt in (`is_enabled_for_insights`), and that can
 *   never be undone. It is only ever switched on by an explicit admin action.
 * - At most 10 template ids per call, daily granularity, 90 days back.
 * - Read and click counts are only kept for 7 days after a send.
 * - Clicks exist for MARKETING and UTILITY templates only; cost is missing for
 *   accounts on a Solution Partner's credit line.
 */

const META_IDS_PER_CALL = 10;
const DAY_SEC = 24 * 60 * 60;
export const MAX_LOOKBACK_DAYS = 90;
/** Meta's own numbers move slowly; this keeps the list page from refetching per view. */
const CACHE_TTL_SEC = 10 * 60;
/** The opt-in flag only ever flips once, from off to on. */
const STATUS_CACHE_TTL_SEC = 60 * 60;

export interface TemplateButtonClicks {
  /** The button's label as the customer saw it. */
  button: string;
  type: "url" | "quick_reply" | "other";
  clicks: number;
  /** Distinct WhatsApp accounts. Meta reports this for URL buttons only. */
  uniqueClicks: number | null;
}

export interface TemplateDailyPoint {
  /** YYYY-MM-DD, UTC. */
  date: string;
  sent: number;
  delivered: number;
  read: number;
  clicks: number;
}

export interface TemplateAnalytics {
  /** RateUp's template id. */
  templateId: string;
  sent: number;
  delivered: number;
  read: number;
  clicks: number;
  buttons: TemplateButtonClicks[];
  /** In the WhatsApp account's currency; null when Meta returned no cost. */
  amountSpent: number | null;
  daily: TemplateDailyPoint[];
}

export type InsightsStatus = "enabled" | "disabled" | "unknown";

interface MetaClick {
  type: string;
  button_content?: string;
  count?: number;
}
interface MetaCost {
  type: string;
  value?: number;
}
interface MetaDataPoint {
  template_id: string;
  start: number;
  end: number;
  sent?: number;
  delivered?: number;
  read?: number;
  clicked?: MetaClick[];
  cost?: MetaCost[];
}

/** The WhatsApp account a channel belongs to, with its token. */
async function resolveAccount(orgId: string, phoneId: string) {
  const settings = await getWaSettings(orgId, phoneId);
  // getWaSettings falls back to the org's oldest number when the id matches
  // nothing; analytics must never answer for a different account.
  if (!settings?.wabaId || settings.phoneId !== phoneId) {
    throw new HttpError("WhatsApp number not found", 404);
  }
  return { wabaId: settings.wabaId, accessToken: settings.accessToken };
}

const statusKey = (wabaId: string) => `wa:template-insights:${wabaId}`;

/** Whether this WhatsApp account has opted in to template analytics. */
export async function getInsightsStatus(orgId: string, phoneId: string): Promise<InsightsStatus> {
  const { wabaId, accessToken } = await resolveAccount(orgId, phoneId);
  const cached = await redis.get(statusKey(wabaId));
  if (cached === "enabled") return "enabled";

  try {
    const res = await callMetaApi(
      `/${wabaId}`,
      "GET",
      accessToken,
      undefined,
      {},
      {},
      {
        fields: "is_enabled_for_insights",
      },
    );
    const flag = res.data?.is_enabled_for_insights;
    if (flag === true) {
      await redis.set(statusKey(wabaId), "enabled", "EX", STATUS_CACHE_TTL_SEC);
      return "enabled";
    }
    return flag === false ? "disabled" : "unknown";
  } catch (err) {
    log.warn({ err, orgId, wabaId }, "Could not read the template insights flag");
    return "unknown";
  }
}

/**
 * Opts the WhatsApp account in to template analytics. Permanent on Meta's side,
 * and it also turns on link tracking for URL buttons — the caller must have
 * shown the admin that before asking.
 */
export async function enableInsights(orgId: string, phoneId: string) {
  const { wabaId, accessToken } = await resolveAccount(orgId, phoneId);
  await callMetaApi(
    `/${wabaId}`,
    "POST",
    accessToken,
    undefined,
    {},
    {},
    {
      is_enabled_for_insights: true,
    },
  );
  await redis.set(statusKey(wabaId), "enabled", "EX", STATUS_CACHE_TTL_SEC);
  log.info({ orgId, wabaId }, "Template analytics enabled on the WhatsApp account");
}

const dayString = (unixSec: number) => new Date(unixSec * 1000).toISOString().slice(0, 10);

function buttonType(metaType: string): TemplateButtonClicks["type"] {
  if (metaType === "url_button") return "url";
  if (metaType === "quick_reply_button") return "quick_reply";
  return "other";
}

/** Folds Meta's daily points into one summary per template. */
export function summarise(points: MetaDataPoint[], idByMetaId: Map<string, string>) {
  const out = new Map<string, TemplateAnalytics>();

  for (const point of points) {
    const templateId = idByMetaId.get(point.template_id);
    if (!templateId) continue;
    let row = out.get(templateId);
    if (!row) {
      row = {
        templateId,
        sent: 0,
        delivered: 0,
        read: 0,
        clicks: 0,
        buttons: [],
        amountSpent: null,
        daily: [],
      };
      out.set(templateId, row);
    }

    let dayClicks = 0;
    for (const click of point.clicked ?? []) {
      const count = click.count ?? 0;
      const label = click.button_content ?? "";
      // unique_url_button repeats the url_button total as distinct accounts:
      // it annotates a button, it is not more clicks.
      if (click.type === "unique_url_button") {
        const button = row.buttons.find((b) => b.type === "url" && b.button === label);
        if (button) button.uniqueClicks = (button.uniqueClicks ?? 0) + count;
        else row.buttons.push({ button: label, type: "url", clicks: 0, uniqueClicks: count });
        continue;
      }
      dayClicks += count;
      const type = buttonType(click.type);
      const button = row.buttons.find((b) => b.type === type && b.button === label);
      if (button) button.clicks += count;
      else row.buttons.push({ button: label, type, clicks: count, uniqueClicks: null });
    }

    const spent = point.cost?.find((c) => c.type === "amount_spent")?.value;
    if (typeof spent === "number") row.amountSpent = (row.amountSpent ?? 0) + spent;

    const sent = point.sent ?? 0;
    const delivered = point.delivered ?? 0;
    const read = point.read ?? 0;
    row.sent += sent;
    row.delivered += delivered;
    row.read += read;
    row.clicks += dayClicks;
    row.daily.push({ date: dayString(point.start), sent, delivered, read, clicks: dayClicks });
  }

  for (const row of out.values()) {
    row.daily.sort((a, b) => a.date.localeCompare(b.date));
    row.buttons.sort((a, b) => b.clicks - a.clicks);
    if (row.amountSpent !== null) row.amountSpent = Math.round(row.amountSpent * 100) / 100;
  }
  return out;
}

async function fetchMetaPoints(
  wabaId: string,
  accessToken: string,
  metaIds: string[],
  start: number,
  end: number,
): Promise<MetaDataPoint[]> {
  const points: MetaDataPoint[] = [];
  for (let i = 0; i < metaIds.length; i += META_IDS_PER_CALL) {
    const batch = metaIds.slice(i, i + META_IDS_PER_CALL);
    let after: string | undefined;
    // Paged by cursor; a 90-day window over 10 templates is usually one page.
    for (let page = 0; page < 20; page++) {
      const res = await callMetaApi(
        `/${wabaId}/template_analytics`,
        "GET",
        accessToken,
        undefined,
        {},
        {},
        {
          start,
          end,
          granularity: "DAILY",
          template_ids: JSON.stringify(batch),
          ...(after && { after }),
        },
      );
      for (const group of res.data?.data ?? []) points.push(...(group.data_points ?? []));
      after = res.data?.paging?.next ? res.data?.paging?.cursors?.after : undefined;
      if (!after) break;
    }
  }
  return points;
}

/**
 * Analytics for some of a channel's templates over the last `days` days.
 * Templates Meta has never seen (drafts) or that belong to another number are
 * left out rather than failing the call.
 */
export async function getTemplateAnalytics(
  orgId: string,
  input: { phoneId: string; templateIds: string[]; days: number },
): Promise<{ status: InsightsStatus; templates: TemplateAnalytics[]; from: string; to: string }> {
  const days = Math.min(Math.max(Math.round(input.days), 1), MAX_LOOKBACK_DAYS);
  const end = Math.floor(Date.now() / 1000);
  // Meta rounds `start` back to 00:00 UTC, so "now minus 90 days" became 90 days
  // and some hours and was refused ("within the last 90 days"). Start at a UTC
  // midnight instead, counting today as the first of the `days`.
  const todayUtc = Math.floor(end / DAY_SEC) * DAY_SEC;
  const start = todayUtc - (days - 1) * DAY_SEC;
  const range = { from: dayString(start), to: dayString(end) };

  const status = await getInsightsStatus(orgId, input.phoneId);
  if (status === "disabled") return { status, templates: [], ...range };

  const { wabaId, accessToken } = await resolveAccount(orgId, input.phoneId);
  const rows = await prisma.waTemplate.findMany({
    where: { orgId, whatsappSettingsPhoneId: input.phoneId, id: { in: input.templateIds } },
    select: { id: true, data: true },
  });
  const idByMetaId = new Map<string, string>();
  for (const row of rows) {
    const metaId = (row.data as { id?: unknown } | null)?.id;
    if (typeof metaId === "string" && metaId) idByMetaId.set(metaId, row.id);
  }
  const metaIds = [...idByMetaId.keys()].sort();
  if (metaIds.length === 0) return { status, templates: [], ...range };

  const cacheKey = `wa:template-analytics:${wabaId}:${days}:${metaIds.join(",")}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { status, templates: JSON.parse(cached) as TemplateAnalytics[], ...range };
  }

  let points: MetaDataPoint[];
  try {
    points = await fetchMetaPoints(wabaId, accessToken, metaIds, start, end);
  } catch (err) {
    // The flag read can come back "unknown"; a refusal here is how Meta says
    // the account has not opted in.
    if (err instanceof GraphApiError && status === "unknown") {
      log.warn({ err, orgId, wabaId }, "Template analytics refused; treating as not enabled");
      return { status: "disabled", templates: [], ...range };
    }
    throw err;
  }

  const templates = [...summarise(points, idByMetaId).values()];
  await redis.set(cacheKey, JSON.stringify(templates), "EX", CACHE_TTL_SEC);
  return { status: status === "unknown" ? "enabled" : status, templates, ...range };
}
