//For New Migrations and Updations

import { axiosClient } from "../apiClient";

const baseUrl = "/public/update";

export async function updateUsageStats() {
  return await axiosClient.post(`${baseUrl}/usage-stats`, null, {
    timeout: 60000,
  });
}

export async function automationSubscription() {
  return await axiosClient.put(`${baseUrl}/update-subscription`, null, {
    timeout: 60000,
  });
}

export async function updationAutomationTriggerSubscription() {
  return await axiosClient.put(`${baseUrl}/rateupplan`, null, {
    timeout: 60000,
  });
}

export async function updationAutomationUsageStats() {
  return await axiosClient.put(`${baseUrl}/usage-stats-automation`, null, {
    timeout: 60000,
  });
}

export async function updateSubscriptionNewFeat() {
  return await axiosClient.put(`${baseUrl}/plan-subscription`, null, {
    timeout: 60000,
  });
}
export async function updateFreePlanSubscriptionExpiry() {
  return await axiosClient.put(`${baseUrl}/free-plan`, null, {
    timeout: 60000,
  });
}

export async function updateLifecycle() {
  return await axiosClient.put(`${baseUrl}/add-default-lifecycle`, null, {
    timeout: 60000,
  });
}

export async function updateCustomField() {
  return await axiosClient.put(`${baseUrl}/migrate-tags`, null, {
    timeout: 60000,
  });
}

export async function updateAutomationPhoneId() {
  return await axiosClient.put(
    `${baseUrl}/migrate-to-whatsapp-phone-ids`,
    null,
    {
      timeout: 60000,
    },
  );
}

export async function updateBackfillMessageData() {
  return await axiosClient.put(`${baseUrl}/backfill`, null, {
    timeout: 60000,
  });
}

export async function migrateAutomationToRules() {
  return await axiosClient.put(`${baseUrl}/migrate-automation-to-rules`, null, {
    timeout: 60000,
  });
}
