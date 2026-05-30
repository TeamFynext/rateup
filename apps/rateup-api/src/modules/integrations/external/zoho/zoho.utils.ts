import { integrationTriggerQueue } from "../../../../utils/redisConnection.js";
import { ZohoTriggers } from "./zoho.service.js";

export function buildZohoLeadPayload(contact: any) {
  const [firstName, ...rest] = (contact.name || "Unknown").split(" ");
  return {
    First_Name: firstName,
    Last_Name: rest.join(" ") || firstName,
    Email: contact.email || "",
    Phone: contact.phone || "",
    Lead_Status: contact.leadStatus || "New",
    Description: `
      Source: ${contact.source}
      PSID: ${contact.psid || ""}
      IGSID: ${contact.igsId || ""}
    `,
  };
}

export function buildZohoContactPayload(contact: any) {
  const [firstName, ...rest] = (contact.name || "Unknown").split(" ");
  return {
    First_Name: firstName,
    Last_Name: rest.join(" ") || firstName,
    Email: contact.email || "",
    Phone: contact.phone || "",
    Description: `
      Source: ${contact.source}
      PSID: ${contact.psid || ""}
      IGSID: ${contact.igsId || ""}
    `,
  };
}

export async function addZohoContactToQueue(contact: any, orgId: string) {
  const [firstName, ...rest] = (contact.name || "Unknown").split(" ");

  const zohoContactPayload = {
    Last_Name: rest.join(" ") || firstName,
    First_Name: firstName,
    Email: contact.email,
    Phone: contact.phone,
    Description: `
    Source: ${contact.source}
    PSID: ${contact.psid || ""}
    IGSID: ${contact.igsId || ""}
    `,
  };

  await integrationTriggerQueue.add("zoho-contact-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.CONTACT_CREATE,
    orgId,
    data: zohoContactPayload,
    rateupContactId: contact.id,
  });

  // Also enqueue Bigin contact create so Bigin-enabled integrations receive the event
  await integrationTriggerQueue.add("zoho-bigin-contact-create", {
    integrationName: "zoho",
    triggerKey: ZohoTriggers.BIGIN_CONTACT_CREATE,
    orgId,
    data: zohoContactPayload,
    rateupContactId: contact.id,
  });
}

export function formatZohoDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // timezone offset
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
  const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

export function isZohoTriggerEnabled(credential: any, trigger: string) {
  const subscriptions = credential?.triggerSubscriptions || [];

  return subscriptions.some(
    (subscription: any) =>
      subscription.subscribed_field === trigger && subscription.active === true,
  );
}
