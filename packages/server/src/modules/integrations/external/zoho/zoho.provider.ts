import { IntegratedApps } from "../../../../types/enums.js";
import { log } from "../../../../utils/logger.js";
import type { IntegrationEventType } from "../../events/integrationEvent.types.js";
import type {
  IntegrationProvider,
  ProviderJobData,
} from "../../providers/integrationProvider.types.js";
import { getValidZohoAccessToken, ZOHO_OAUTH, ZOHO_SCOPES, zohoScopesFor } from "./zoho.auth.js";
import { processZohoBiginJob, ZOHO_BIGIN_TRIGGERS } from "./zoho.bigin.js";
import { connectZoho, disconnectZoho, refreshZohoIntegrationCredential } from "./zoho.connect.js";
import { processZohoCrmJob, ZOHO_CRM_TRIGGERS } from "./zoho.crm.js";
import { handleZohoEvent } from "./zoho.events.js";
import { handleZohoInbound, processZohoInboundJob } from "./zoho.inbound.js";
import {
  getZohoCredential,
  ZOHO_INBOUND,
  ZohoTriggers,
  type ZohoInboundJobData,
  type ZohoTriggerData,
} from "./zoho.types.js";
import { isZohoTriggerEnabled } from "./zoho.utils.js";

/**
 * The Zoho triggers each event can produce. An event counts as subscribed when
 * any one of them is switched on; `processJob` then drops the individual jobs
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

  async processJob(integration, job) {
    if (job.triggerKey === ZOHO_INBOUND) {
      return processZohoInboundJob(integration, job as ProviderJobData<ZohoInboundJobData>);
    }

    // Each job is checked against its own switch: the fan-out only knew that
    // one of the event's triggers was on.
    const credential = getZohoCredential(integration);
    if (!isZohoTriggerEnabled(credential, job.triggerKey)) {
      log.info("Zoho trigger %s is not subscribed", job.triggerKey);
      return;
    }

    const context = {
      integration,
      credential,
      accessToken: await getValidZohoAccessToken(integration),
      rateupContactId: job.rateupContactId,
      rateupLeadId: job.rateupLeadId,
    };
    const data = job.data as ZohoTriggerData;
    log.info("Processing Zoho trigger=%s", job.triggerKey);

    if (ZOHO_CRM_TRIGGERS.includes(job.triggerKey)) {
      return processZohoCrmJob(context, job.triggerKey, data);
    }
    if (ZOHO_BIGIN_TRIGGERS.includes(job.triggerKey)) {
      return processZohoBiginJob(context, job.triggerKey, data);
    }
    throw new Error(`Unsupported Zoho trigger ${job.triggerKey}`);
  },

  // Zoho → Rateup notifications, on the shared receiver. The old
  // `/zoho/webhooks/:product` address hands its deliveries here too.
  handleInbound: handleZohoInbound,

  oauth: {
    config: ZOHO_OAUTH,
    scopes: ZOHO_SCOPES,
    scopesFor: zohoScopesFor,
    scopeSeparator: ",",
    // A refresh token on every connect, not only the first consent: a
    // reconnect without one could never refresh.
    extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
    connect: connectZoho,
  },

  // Refreshes the token and re-registers the CRM and Bigin webhook channels,
  // which Zoho expires on its own schedule.
  async refreshCredential(integration) {
    await refreshZohoIntegrationCredential(integration);
  },

  disconnect: disconnectZoho,
};
