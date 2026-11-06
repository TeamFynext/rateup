import { IntegratedApps } from "../../../types/enums.js";

/**
 * The no-code automation platforms (Zapier, Make, …). Each is one `Integration`
 * row per org holding an API key and the platform's REST-hook subscriptions, and
 * each gets the same trigger catalogue (`ZapierTriggers`) and payloads
 * (`zapier.payloads.ts`). The Zapier names are kept: they are the contract the
 * published Zapier app was built on.
 */
export const AUTOMATION_PLATFORMS = [
  IntegratedApps.zapier,
  IntegratedApps.make,
  IntegratedApps.pabbly,
] as const;

export type AutomationPlatform = (typeof AUTOMATION_PLATFORMS)[number];

export function isAutomationPlatform(name: string): name is AutomationPlatform {
  return (AUTOMATION_PLATFORMS as readonly string[]).includes(name);
}

/** How logs and errors name each platform. */
export const AUTOMATION_PLATFORM_LABELS: Record<AutomationPlatform, string> = {
  [IntegratedApps.zapier]: "Zapier",
  [IntegratedApps.make]: "Make",
  [IntegratedApps.pabbly]: "Pabbly Connect",
};

/**
 * `triggerKey` of a provider job that posts one payload to one hook. Zapier's is
 * `zapier_delivery`, the value jobs already queued before this change carry.
 */
export function automationDeliveryKey(platform: AutomationPlatform) {
  return `${platform}_delivery`;
}
