import { JSX } from "react";

import { Badge } from "@mantine/core";

import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getSubscriptionFeatureLabel } from "../../../utils/enums";
import { subscriptionColorMap } from "./features.colors";

export function FeatureBadge({
  featurePathName,
}: {
  featurePathName: SubscriptionFeaturePathName;
}): JSX.Element {
  return (
    <Badge key={featurePathName} color={subscriptionColorMap[featurePathName]}>
      {getSubscriptionFeatureLabel(featurePathName)}
    </Badge>
  );
}
