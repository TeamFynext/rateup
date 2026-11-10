import { Counter } from "@prometheus-io/client";

/**
 * Old API URL prefixes and the ones that replaced them (2026-11-10), when the API's URLs
 * were renamed to match the dashboard: Chatbots → Journeys, Contact groups → Audiences,
 * automated replies → Rules, the inbox out of `/wa`, kebab-case names, and so on.
 *
 * Installed mobile apps (and any open dashboard tab from before a deploy) still call the
 * old URLs, so the server rewrites an old prefix to its new one before routing
 * (`rewriteUrl` in app.ts). A route exists only at its new URL. Audit log rows written
 * before the rename hold old paths; `currentApiPath` also reads those.
 *
 * Rows are tried in order and the first match wins, so a longer prefix comes before a
 * shorter one it starts with. A prefix matches on a segment boundary: `/api/contact`
 * takes `/api/contact`, `/api/contact/x` and `/api/contact?x`, never `/api/contacts`.
 * `:name` matches one path segment and is carried over into `to`.
 *
 * Paths that Meta, Stripe, Zapier, printed QR codes and other outside callers use were
 * not renamed (`/api/wa/webhook`, `/api/wa/endpoint`, `/api/wa/redirect`, `/api/public/*`,
 * `/api/external/*`, `/api/integration/external/*`, …), so nothing here is needed for them.
 *
 * `legacy_api_path_requests_total{prefix}` counts old-URL requests. A row can go once its
 * count stays at zero, which for the mobile app means once no supported build calls it.
 */
export const LEGACY_API_PREFIXES: readonly { from: string; to: string }[] = [
  // Inbox
  { from: "/api/wa/inbox", to: "/api/inbox" },
  { from: "/api/wa/calls", to: "/api/inbox/calls" },
  { from: "/api/contact/conversations", to: "/api/inbox/conversations" },
  { from: "/api/contact/conversation-tags", to: "/api/inbox/conversation-tags" },
  // Contacts and campaigns
  { from: "/api/contact/group", to: "/api/contacts/audiences" },
  { from: "/api/contact", to: "/api/contacts" },
  { from: "/api/campaign", to: "/api/campaigns" },
  // Automation
  { from: "/api/wa/automated-reply/rule", to: "/api/automation/rules" },
  { from: "/api/chatbots", to: "/api/automation/journeys" },
  // Meta: WhatsApp, Instagram, Messenger; the catalog moved to Commerce
  { from: "/api/wa/settings/conversational-automation", to: "/api/whatsapp/ice-breakers" },
  { from: "/api/wa/catalog", to: "/api/commerce/catalogs" },
  { from: "/api/wa/instagram-profile", to: "/api/instagram/profile" },
  { from: "/api/wa/instagram-insights", to: "/api/instagram/insights" },
  { from: "/api/wa/instagram", to: "/api/instagram" },
  { from: "/api/wa/messenger-profile", to: "/api/messenger/profile" },
  { from: "/api/wa/templates", to: "/api/whatsapp/templates" },
  { from: "/api/wa/flows", to: "/api/whatsapp/flows" },
  { from: "/api/wa/settings", to: "/api/whatsapp/settings" },
  { from: "/api/wa/auth", to: "/api/whatsapp/auth" },
  // Surveys & Links
  { from: "/api/question/:surveyId", to: "/api/surveys/:surveyId/questions" },
  { from: "/api/response", to: "/api/surveys/responses" },
  { from: "/api/surveyTheme", to: "/api/surveys/themes" },
  { from: "/api/survey", to: "/api/surveys" },
  { from: "/api/testimonial/collections", to: "/api/surveys/testimonials/collections" },
  { from: "/api/testimonials", to: "/api/surveys/testimonials" },
  { from: "/api/linktrees", to: "/api/link-pages" },
  { from: "/api/generateQr", to: "/api/qr-codes" },
  { from: "/api/reviewSuggestion", to: "/api/review-suggestions" },
  { from: "/api/shareSettings", to: "/api/share-settings" },
  // Settings, analytics and the rest
  { from: "/api/team", to: "/api/teams" },
  { from: "/api/apianalytics", to: "/api/analytics" },
  { from: "/api/api-access-token", to: "/api/api-keys" },
  { from: "/api/mobilenotification", to: "/api/mobile-notifications" },
  { from: "/api/notification", to: "/api/notifications" },
  { from: "/api/bookdemo", to: "/api/book-demo" },
  { from: "/api/webhook", to: "/api/webhooks" },
];

interface CompiledPrefix {
  from: string;
  to: string;
  /** The prefix as a regular expression, without anchors (also valid in Postgres). */
  source: string;
  pattern: RegExp;
  replacement: string;
}

function compile({ from, to }: { from: string; to: string }): CompiledPrefix {
  const params: string[] = [];
  const source = from
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      params.push(segment.slice(1));
      return "([^/?#]+)";
    })
    .join("/");
  const replacement = to.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    const index = params.indexOf(name);
    if (index === -1) throw new Error(`legacyPaths: ${to} uses :${name}, which ${from} lacks`);
    return `$${index + 1}`;
  });
  return { from, to, source, pattern: new RegExp(`^${source}(?=[/?#]|$)`), replacement };
}

/** Each old prefix with its pattern, in match order (for the audit log's SQL). */
export const LEGACY_PREFIX_PATTERNS: readonly CompiledPrefix[] = LEGACY_API_PREFIXES.map(compile);
const COMPILED = LEGACY_PREFIX_PATTERNS;

function match(url: string): { compiled: CompiledPrefix; url: string } | undefined {
  // Cheap exit for the common case: every old prefix is under /api/.
  if (!url.startsWith("/api/")) return undefined;
  for (const compiled of COMPILED) {
    if (compiled.pattern.test(url)) {
      return { compiled, url: url.replace(compiled.pattern, compiled.replacement) };
    }
  }
  return undefined;
}

/** The current URL for `url` (path plus any query string); `url` itself when it is not old. */
export function currentApiPath(url: string): string {
  return match(url)?.url ?? url;
}

const legacyRequests = new Counter({
  name: "legacy_api_path_requests_total",
  help: "Requests that arrived on a renamed API URL and were rewritten to the new one",
  labelNames: ["prefix"] as const,
});

/** Fastify's `rewriteUrl`: old URLs are served by the route at the new one. */
export function rewriteLegacyUrl(req: { url?: string }): string {
  const url = req.url ?? "/";
  const found = match(url);
  if (!found) return url;
  legacyRequests.inc({ prefix: found.compiled.from });
  return found.url;
}
