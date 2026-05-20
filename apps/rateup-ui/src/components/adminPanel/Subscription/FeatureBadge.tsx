import type { JSX } from "react";

import { Badge } from "@mantine/core";

import type { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { getSubscriptionFeatureLabel } from "@/utils/enums/index.ts";

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
