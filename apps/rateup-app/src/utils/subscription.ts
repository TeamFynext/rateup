import { SubscriptionFeaturePathName } from "../../enums";
import type { Subscription } from "@/api/subscription/subscription.type";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getNestedProperty(sourceObject: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((obj, key) => (isRecord(obj) ? obj[key] : undefined), sourceObject);
}

export function hasFeature(
  subscription: Subscription | null | undefined,
  featurePath: SubscriptionFeaturePathName,
): boolean {
  if (!subscription) return false;
  const feature = getNestedProperty(subscription.features, featurePath);
  return isRecord(feature) && feature.active === true;
}

/**
 * Why the API refused, when it refused with 403.
 *
 * A plan gate and a permission gate are both 403s but they are opposite problems: one is
 * fixed by paying, the other by asking an admin. Mirrors `AccessDenialReason` in the web's
 * `utils/apiError.ts`, which is what the server's `reason` field is written against.
 */
export type AccessDenialReason = "subscription" | "subscription_expired" | "team" | "unknown";

/**
 * The refusal reason behind a rejection, or null when it was not a 403.
 *
 * Prefers the server's own `reason`. The message fallback covers the 403s written by hand
 * in individual controllers, which carry no `reason` — without it those read as permission
 * problems and send a paying customer to their admin for a billing issue.
 */
export function accessDenialReason(error: unknown): AccessDenialReason | null {
  if (!isRecord(error)) return null;
  const response = error.response;
  if (!isRecord(response) || response.status !== 403) return null;

  const data = response.data;
  if (isRecord(data)) {
    const reason = data.reason;
    if (
      reason === "subscription" ||
      reason === "subscription_expired" ||
      reason === "team" ||
      reason === "unknown"
    ) {
      return reason;
    }
    const message = typeof data.message === "string" ? data.message.toLowerCase() : "";
    if (message.includes("expired")) return "subscription_expired";
    if (message.includes("subscription")) return "subscription";
  }
  return "unknown";
}
