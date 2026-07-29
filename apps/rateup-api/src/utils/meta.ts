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

/**
 * Graph host. Overridable so an end-to-end run can point the whole service at a
 * local stand-in and exercise the WhatsApp and Instagram write paths without a
 * single packet reaching Meta — see `@rateup/meta-mock`. Unset everywhere else,
 * which is the real Graph host.
 */
export const META_API_HOST = process.env.META_API_BASE_URL ?? "https://graph.facebook.com";

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
export const META_AGENT_API_HOST = process.env.META_API_BASE_URL ?? "https://api.facebook.com";
export const META_AGENT_API_VERSION = "2.0.0";
