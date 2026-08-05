import { SubscriptionFeaturePathName } from "../../enums";
import type { Subscription } from "@/api/sunscription/subscription.type";

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
