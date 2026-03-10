//For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export async function migrateWaTemplateToWhatsappPhoneId() {
  return await axiosClient.put(
    `${baseUrl}/migrate-wa-template-to-whatsapp-phone-id`,
    null,
    {
      timeout: 60000,
    },
  );
}
