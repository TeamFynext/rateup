import { IntegratedApps } from "../../../../types/enums.js";
import type { IntegrationEventType } from "../../events/integrationEvent.types.js";
import type { IntegrationProvider } from "../../providers/integrationProvider.types.js";
import { connectGetLeadFromForm } from "./getlead.connect.js";
import { handleGetLeadEvent } from "./getlead.events.js";
import { processGetLeadJob } from "./getlead.push.js";
import { getGetLeadCredential, GetLeadTriggers } from "./getlead.types.js";
import { isGetLeadTriggerEnabled } from "./getlead.utils.js";

/** The GetLead trigger each event is pushed under — one each. */
const TRIGGER_BY_EVENT: Partial<Record<IntegrationEventType, string>> = {
  "lead.created": GetLeadTriggers.LEAD_CREATE,
  "lead.stage_changed": GetLeadTriggers.LEAD_UPDATE,
};

const EVENTS = Object.keys(TRIGGER_BY_EVENT) as IntegrationEventType[];

/**
 * GetLead: outbound lead push keyed on the board column, plus an inbound webhook.
 *
 * The inbound receiver is not `handleInbound`: each org pasted its webhook URL,
 * keyed by a secret token rather than the integration id, into a GetLead
 * workflow by hand, so it stays at `/api/public/integrations/getlead/hooks/:token`
 * (`getlead.webhook.controller.ts`).
 */
export const getLeadProvider: IntegrationProvider = {
  name: IntegratedApps.getlead,
  label: "GetLead",
  auth: "apiKey",
  connection: "integration",
  events: EVENTS,

  subscribedEvents(integration) {
    if (!integration) return [];
    const credential = getGetLeadCredential(integration);
    return EVENTS.filter((event) =>
      isGetLeadTriggerEnabled(credential, TRIGGER_BY_EVENT[event] ?? ""),
    );
  },

  handleEvent: handleGetLeadEvent,

  processJob: processGetLeadJob,

  apiKey: { connect: connectGetLeadFromForm },
};
