import { Badge } from "@mantine/core";

import { CampaignRewardType } from "../../../types/enums";

export function RewardTypeBadge({ type }: { type: CampaignRewardType }) {
  let color = "blue";
  switch (type) {
    case CampaignRewardType.Fixed:
      color = "blue";
      break;
    case CampaignRewardType.Percentage:
      color = "green";
      break;
  }
  return (
    <Badge color={color} variant="light">
      {type}
    </Badge>
  );
}
