import { Badge } from "@mantine/core";
import { CampaignRewardType, LoyaltyCampaignType } from "../../../types/enums";
import { getLoyaltyCampaignTypeLabel } from "../../../utils/enums";

export function LCampaignTypeBadge({ type }: { type: LoyaltyCampaignType }) {
  let color = "blue";
  switch (type) {
    case LoyaltyCampaignType.Referral:
      color = "blue";
      break;
    case LoyaltyCampaignType.ReferralTransaction:
      color = "green";
      break;
    case LoyaltyCampaignType.Transaction:
      color = "red";
      break;
  }
  return (
    <Badge color={color} variant="light">
      {getLoyaltyCampaignTypeLabel(type)}
    </Badge>
  );
}
