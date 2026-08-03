import { SubscriptionFeaturePathName as sfpn } from "@/types/enums.ts";

export const subscriptionColorMap: Partial<Record<sfpn, string>> = {
  [sfpn.Team]: "red",
  [sfpn.ReputationManagement]: "grape",
  [sfpn.WebSurvey]: "blue",
  [sfpn.Whatsapp]: "green",
  [sfpn.TeamMember]: "yellow",
  [sfpn.AI]: "black",
  [sfpn.Webhook]: "orange",
  [sfpn.WhatsAppConversation]: "green",
};
