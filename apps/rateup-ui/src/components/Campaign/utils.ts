import { CampaignParticipantStatus } from "@/types/enums.ts";

export const getStatusBadgeStyle = (status: CampaignParticipantStatus): string => {
  switch (status) {
    case CampaignParticipantStatus.READ:
      return "bg-green-100 text-green-700 border-green-200";
    case CampaignParticipantStatus.DELIVERED:
      return "bg-blue-100 text-blue-700 border-blue-200";
    case CampaignParticipantStatus.SENT:
      return "bg-purple-100 text-purple-700 border-purple-200";
    case CampaignParticipantStatus.FAILED:
      return "bg-red-100 text-red-700 border-red-200";
    case CampaignParticipantStatus.PENDING:
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};
