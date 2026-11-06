import { integrationTriggerQueue } from "../../../../workers/bullmq/queues/index.js";
import { ZohoTriggers, type ZohoCredential } from "./zoho.types.js";

function parseZohoName(name?: string | null) {
  const cleanName = (name || "").trim();
  if (!cleanName) {
    return {
      First_Name: "",
      Last_Name: "Unknown",
    };
  }
  const parts = cleanName.split(" ").filter(Boolean);
  // SINGLE WORD NAME
  if (parts.length === 1) {
    return {
      First_Name: "",
      Last_Name: parts[0],
    };
  }
  return {
    First_Name: parts.shift() || "",
    Last_Name: parts.join(" ") || "Unknown",
  };
}

/**
 * The Rateup-side contact fields Zoho payloads are built from. Callers pass a
 * `Contact` row or a lighter object assembled from a webhook — both satisfy this.
 */
export interface ZohoContactSource {
  /** The Rateup contact id, carried through to the queue job. */
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  psid?: string | null;
  igsId?: string | null;
  leadStatus?: string | null;
}

export function buildZohoLeadPayload(contact: ZohoContactSource) {
  const parsedName = parseZohoName(contact.name);

  return {
    ...parsedName,
    Email: contact.email || "",
    Phone: contact.phone || "",
    Lead_Status: contact.leadStatus || "New",
    Description: `
      Source: ${contact.source || ""}
      PSID: ${contact.psid || ""}
      IGSID: ${contact.igsId || ""}
    `,
  };
}

export function buildZohoContactPayload(contact: ZohoContactSource) {
  const parsedName = parseZohoName(contact.name);

  return {
    ...parsedName,
    Email: contact.email || "",
    Phone: contact.phone || "",
    Description: `
      Source: ${contact.source || ""}
      PSID: ${contact.psid || ""}
      IGSID: ${contact.igsId || ""}
    `,
  };
}

export async function addZohoContactToQueue(contact: ZohoContactSource, orgId: string) {
  const zohoContactPayload = buildZohoContactPayload(contact);

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

export function isZohoTriggerEnabled(
  credential: Pick<ZohoCredential, "triggerSubscriptions"> | null | undefined,
  trigger: string,
) {
  const subscriptions = credential?.triggerSubscriptions ?? [];

  return subscriptions.some(
    (subscription) => subscription.subscribed_field === trigger && subscription.active === true,
  );
}
