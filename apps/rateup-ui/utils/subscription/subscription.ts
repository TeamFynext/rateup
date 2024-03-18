import { SubscriptionFeaturePathName } from "../../types/enums";
import { getNestedProperty } from "../misc/obj.utils";

export function hasFeature(
  subscription,
  featurePath: SubscriptionFeaturePathName,
) {
  if (!subscription) return false;
  return getNestedProperty(subscription.features, featurePath).active;
}
