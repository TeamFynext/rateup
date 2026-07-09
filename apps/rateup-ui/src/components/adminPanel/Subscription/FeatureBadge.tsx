import type { JSX } from "react";

import { Badge } from "@/components/ui/badge.tsx";
import type { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { getSubscriptionFeatureLabel } from "@/utils/enums/index.ts";

import { subscriptionColorMap } from "./features.colors";

const cssColorMap: Record<string, string> = {
  grape: "#be4bdb",
};

export function FeatureBadge({
  featurePathName,
}: Readonly<{
  featurePathName: SubscriptionFeaturePathName;
}>): JSX.Element {
  const color = subscriptionColorMap[featurePathName];
  return (
    <Badge
      key={featurePathName}
      style={{ backgroundColor: cssColorMap[color] ?? color, color: "white" }}
    >
      {getSubscriptionFeatureLabel(featurePathName)}
    </Badge>
  );
}
