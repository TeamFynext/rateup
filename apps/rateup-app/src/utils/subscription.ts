import { SubscriptionFeaturePathName } from "../../enums";

export function getNestedProperty(sourceObject: object, path: string) {
  return path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
      sourceObject,
    );
}

export function hasFeature(
  subscription: any,
  featurePath: SubscriptionFeaturePathName,
) {
  if (!subscription) return false;
  return getNestedProperty(subscription.features, featurePath)?.active;
}
