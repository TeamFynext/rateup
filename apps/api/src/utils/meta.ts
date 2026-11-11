import { log } from "./logger.js";
import { envFlag } from "./envFlag.js";

/**
 * Where Meta lives, and which version we speak. The only place either is
 * written down.
 *
 * These were previously spread across four files with three different versions:
 * `wa_axios.ts` used v25.0, `constants.ts` built a v21.0 base URL that nothing
 * imported, and `flow.service.ts` hardcoded v21.0 for its one raw-axios upload.
 * So flow assets went to a different API version than every other flow call —
 * invisible until Meta retires one of them, and there was nothing to grep that
 * would have shown it.
 */

type Env = Record<string, string | undefined>;

/**
 * True only where the runtime says, explicitly, that it is not production: a local
 * `NODE_ENV=development`, vitest's `NODE_ENV=test`, or a Railway environment other than
 * `production`. Production leaves `NODE_ENV` unset, so an unset value counts as
 * production, and a Railway `production` environment wins over any `NODE_ENV`.
 */
export function isNonProductionRuntime(env: Env = process.env): boolean {
  const railway = env.RAILWAY_ENVIRONMENT_NAME?.trim().toLowerCase();
  if (railway === "production") return false;
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return true;
  return Boolean(railway);
}

/**
 * The `META_API_BASE_URL` override, or null when it must not be honoured.
 *
 * It points every Graph call — with decrypted WABA tokens in the headers — at a stand-in
 * (`@rateup/meta-mock`). A copy-pasted variable once left the production worker aimed at
 * the dev mock, so outside a non-production runtime it is ignored unless
 * `ALLOW_META_MOCK=true` says the override is deliberate.
 */
export function resolveMetaBaseUrl(env: Env = process.env): string | null {
  const override = env.META_API_BASE_URL?.trim();
  if (!override) return null;
  if (envFlag("ALLOW_META_MOCK", false, env) || isNonProductionRuntime(env)) return override;
  log.error(
    { META_API_BASE_URL: override },
    "META_API_BASE_URL is set in production and is ignored; Graph calls go to Meta. " +
      "Remove the variable, or set ALLOW_META_MOCK=true if the override is intended.",
  );
  return null;
}

const META_BASE_URL_OVERRIDE = resolveMetaBaseUrl();

/**
 * Where a configured `@rateup/meta-mock` listens, or null against the real Graph. The
 * mock's own control plane (`metaMock.ts`) should read this rather than the variable.
 */
export const META_MOCK_BASE_URL = META_BASE_URL_OVERRIDE;

/**
 * Graph host. Overridable so an end-to-end run can point the whole service at a
 * local stand-in and exercise the WhatsApp and Instagram write paths without a
 * single packet reaching Meta — see `@rateup/meta-mock` and `resolveMetaBaseUrl`.
 * Unset everywhere else, which is the real Graph host.
 */
export const META_API_HOST = META_BASE_URL_OVERRIDE ?? "https://graph.facebook.com";

/** The Graph version every call uses. Bump here and the whole service moves. */
export const META_API_VERSION = "v25.0";

/** `/{waba-id}/flows` → `https://graph.facebook.com/v25.0/{waba-id}/flows`. */
export function graphUrl(path: string): string {
  return `${META_API_HOST}/${META_API_VERSION}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The Meta Business Agent API — a different host and its own version scheme,
 * so it does not share the constants above.
 */
export const META_AGENT_API_HOST = META_BASE_URL_OVERRIDE ?? "https://api.facebook.com";
export const META_AGENT_API_VERSION = "2.0.0";
