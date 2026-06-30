// For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export async function migrateWaTemplateToWhatsappPhoneId() {
  return await axiosClient.put(`${baseUrl}/migrate-wa-template-to-whatsapp-phone-id`, null, {
    timeout: 60000,
  });
}

export async function syncTeamFeatures() {
  return await axiosClient.put(`${baseUrl}/sync-team-features`, null, {
    timeout: 60000,
  });
}

export async function migrateLoyaltyTierPriority() {
  return await axiosClient.put(`${baseUrl}/migrate-loyalty-tier-priority`, null, {
    timeout: 60000,
  });
}

export async function migrateTicketLabels() {
  return await axiosClient.put(`${baseUrl}/migrate-ticket-labels`, null, {
    timeout: 60000,
  });
}
