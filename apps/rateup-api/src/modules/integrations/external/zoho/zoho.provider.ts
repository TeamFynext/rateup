import { IntegratedApps } from "../../../../types/enums.js";
import type { IntegrationEventType } from "../../events/integrationEvent.types.js";
import type { IntegrationProvider } from "../../providers/integrationProvider.types.js";
import { handleZohoEvent } from "./zoho.events.js";
import { processZoho, refreshZohoIntegrationCredential, ZohoTriggers } from "./zoho.service.js";
import type { ZohoTriggerData } from "./zoho.types.js";
import { getZohoCredential } from "./zoho.types.js";
import { isZohoTriggerEnabled } from "./zoho.utils.js";

/**
 * The Zoho triggers each event can produce. An event counts as subscribed when
 * any one of them is switched on; `processZoho` then drops the individual jobs
 * the org did not ask for, exactly as it always has.
 *
 * `LEAD_UPDATE` is listed wherever `pushCrmLeadStatus` can run: it is the
 * trigger the status push is enqueued under.
 */
const TRIGGERS_BY_EVENT: Record<string, readonly string[]> = {
  "contact.created": [
    ZohoTriggers.CONTACT_CREATE,
    ZohoTriggers.BIGIN_CONTACT_CREATE,
    ZohoTriggers.LEAD_CREATE,
    ZohoTriggers.BIGIN_DEAL_CREATE,
  ],
  "contact.updated": [
    ZohoTriggers.CONTACT_UPDATE,
    ZohoTriggers.BIGIN_CONTACT_UPDATE,
    ZohoTriggers.LEAD_UPDATE,
    ZohoTriggers.BIGIN_DEAL_CREATE,
  ],
  "contact.deleted": [ZohoTriggers.CONTACT_DELETE, ZohoTriggers.BIGIN_CONTACT_DELETE],
  "lead.created": [ZohoTriggers.LEAD_UPDATE, ZohoTriggers.BIGIN_DEAL_CREATE],
  "lead.stage_changed": [ZohoTriggers.LEAD_UPDATE, ZohoTriggers.BIGIN_DEAL_CREATE],
};

const EVENTS = Object.keys(TRIGGERS_BY_EVENT) as IntegrationEventType[];

/** Zoho CRM and Bigin, connected through one OAuth grant. */
export const zohoProvider: IntegrationProvider = {
  name: IntegratedApps.zoho,
  label: "Zoho",
  auth: "oauth2",
  connection: "integration",
  events: EVENTS,

  subscribedEvents(integration) {
    if (!integration) return [];
    const credential = getZohoCredential(integration);
    return EVENTS.filter((event) =>
      TRIGGERS_BY_EVENT[event].some((trigger) => isZohoTriggerEnabled(credential, trigger)),
    );
  },

  handleEvent: handleZohoEvent,

  processJob(integration, job) {
    return processZoho(
      integration,
      job.triggerKey,
      job.data as ZohoTriggerData,
      job.orgId,
      job.rateupContactId,
      job.rateupLeadId,
    );
  },

  // Refreshes the token and re-registers the CRM and Bigin webhook channels,
  // which Zoho expires on its own schedule.
  async refreshCredential(integration) {
    await refreshZohoIntegrationCredential(integration);
  },
};
