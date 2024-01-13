import { Badge } from "@mantine/core";
import { getSubscriptionFeatureLabel } from "../../../utils/enums";
import { subscriptionColorMap } from "./features.colors";
import { SubscriptionFeaturePathName } from "../../../types/enums";

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
