import { SubscriptionFeaturePathName as sfpn } from "@/types/enums.ts";

export const subscriptionColorMap: Partial<Record<sfpn, string>> = {
  [sfpn.Team]: "red",
  [sfpn.WebSurvey]: "blue",
  [sfpn.Whatsapp]: "green",
  [sfpn.TeamMember]: "yellow",
  [sfpn.AI]: "black",
  [sfpn.Webhook]: "orange",
  [sfpn.WhatsAppConversation]: "green",
  [sfpn.WhatsappCampaign]: "grape",
  [sfpn.WhatsappLoyalty]: "pink",
  [sfpn.WhatsappReferrals]: "cyan",
  [sfpn.WhatsappCatalog]: "teal",
};
