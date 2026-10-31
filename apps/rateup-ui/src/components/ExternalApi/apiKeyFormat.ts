import type { ApiKey, ApiKeyFeature, ApiKeyVersion } from "@/backend/apiKeys/apiKeys.api.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * How a key's expiry reads in the table. A key inside the next week is "soon" — usually the
 * old half of a rotation in its grace period — and is counted down rather than dated.
 */
export type KeyExpiry =
  | { kind: "never" }
  | { kind: "expired" }
  | { kind: "minutes"; value: number }
  | { kind: "hours"; value: number }
  | { kind: "days"; value: number }
  | { kind: "date"; at: Date };

export function keyExpiry(expiresAt: string | null, now = Date.now()): KeyExpiry {
  if (!expiresAt) return { kind: "never" };
  const at = new Date(expiresAt);
  const left = at.getTime() - now;
  if (left <= 0) return { kind: "expired" };
  if (left < HOUR_MS) return { kind: "minutes", value: Math.max(1, Math.ceil(left / 60_000)) };
  if (left < 2 * DAY_MS) return { kind: "hours", value: Math.ceil(left / HOUR_MS) };
  if (left < 7 * DAY_MS) return { kind: "days", value: Math.ceil(left / DAY_MS) };
  return { kind: "date", at };
}

/** Whether a countdown (rather than a plain date) applies, which the table tints amber. */
export const isExpiringSoon = (expiry: KeyExpiry) =>
  expiry.kind === "minutes" || expiry.kind === "hours" || expiry.kind === "days";

/** The features a key can be limited to, as the picker lists them. Labels are translation keys. */
export const FEATURE_OPTIONS: readonly {
  value: ApiKeyFeature;
  label: string;
  description: string;
}[] = [
  { value: "contacts", label: "Contacts", description: "Contacts and audiences." },
  { value: "teams", label: "Teams", description: "List teams, to route sends." },
  {
    value: "campaigns",
    label: "Campaigns",
    description: "Create and send campaigns, and read their responses.",
  },
  { value: "surveys", label: "Surveys", description: "Read surveys and their responses." },
  {
    value: "whatsapp",
    label: "WhatsApp messaging",
    description: "Send approved templates and read message status.",
  },
  {
    value: "loyalty",
    label: "Loyalty",
    description: "Members, points, rewards and vouchers.",
  },
  {
    value: "widget",
    label: "Webchat widget",
    description:
      "Lets the support widget on your website connect. This key is visible in your page's source, so give it nothing else.",
  },
];

/** The name and access the widget setup gives the key it creates. */
export const WIDGET_KEY_NAME = "Webchat widget";
export const WIDGET_KEY_FEATURES: ApiKeyFeature[] = ["widget"];

/** A key that can run the support widget and nothing else: safe to put in a public page. */
export const isWidgetOnlyKey = (key: Pick<ApiKey, "scopes">) =>
  key.scopes.length > 0 && key.scopes.every((scope) => scope === "widget.connect");

/**
 * A key's prefix as the table shows it, trailed by an ellipsis. A v1 prefix (`ab12…`) arrives
 * with the ellipsis already on; a v2 one (`rk_live_ab12`) does not. A legacy key not used since
 * the upgrade has none yet, so it shows masked until its next request fills it in.
 */
export const maskedKeyPrefix = (displayPrefix: string | null) => {
  if (!displayPrefix) return "••••…";
  return displayPrefix.endsWith("…") ? displayPrefix : `${displayPrefix}…`;
};

/** The partner API's base URL for each version. v1 names the org in the path; v2 keys name it. */
export function externalApiBaseUrl(apiOrigin: string, version: ApiKeyVersion, orgId?: string) {
  const origin = apiOrigin.replace(/\/+$/, "");
  return version === "v2"
    ? `${origin}/api/external/v2`
    : `${origin}/api/external/v1/${orgId ?? "{orgId}"}`;
}

/** The rotation grace periods offered, in hours. 24 is the API's own default. */
export const GRACE_OPTIONS = [0, 1, 24, 168] as const;
export type GraceHours = (typeof GRACE_OPTIONS)[number];
export const DEFAULT_GRACE_HOURS: GraceHours = 24;

/** `YYYY-MM-DD` for each of the last `days` UTC days, oldest first, ending today. */
export function lastUtcDays(days: number, now = new Date()): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) =>
    new Date(today - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10),
  );
}
