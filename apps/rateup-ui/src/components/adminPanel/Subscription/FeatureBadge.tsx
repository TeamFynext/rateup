import type { JSX } from "react";

import { Badge } from "@/components/ui/badge.tsx";
import type { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { getSubscriptionFeatureLabel, isKnownSubscriptionFeature } from "@/utils/enums/index.ts";

import { subscriptionColorMap } from "./features.colors";

const cssColorMap: Record<string, string> = {
  grape: "#be4bdb",
};

export function FeatureBadge({
  featurePathName,
}: Readonly<{
  featurePathName: SubscriptionFeaturePathName;
}>): JSX.Element {
  // Stored features are untyped JSON, so a row can name a path the app retired
  // (`loyalty`, `whatsapp.flow`). Those still render — hiding them would make a
  // legacy row look migrated — but as a muted outline chip carrying the raw key,
  // so it reads as leftover data rather than a feature anyone can rely on.
  if (!isKnownSubscriptionFeature(featurePathName)) {
    return (
      <Badge variant="outline" className="text-muted-foreground" title={featurePathName}>
        {getSubscriptionFeatureLabel(featurePathName)} (unrecognised)
      </Badge>
    );
  }

  const color = subscriptionColorMap[featurePathName];
  return (
    <Badge style={{ backgroundColor: cssColorMap[color ?? ""] ?? color, color: "white" }}>
      {getSubscriptionFeatureLabel(featurePathName)}
    </Badge>
  );
}
