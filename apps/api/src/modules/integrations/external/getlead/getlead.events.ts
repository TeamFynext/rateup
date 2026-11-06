import { LEADS_PIPELINE_TYPE } from "../../../pipeline/pipelineTypes.js";
import type { IntegrationEvent } from "../../events/integrationEvent.types.js";
import type { IntegrationEventContext } from "../../providers/integrationProvider.types.js";
import { addGetLeadSyncToQueue } from "./getlead.queue.js";
import { GetLeadTriggers } from "./getlead.types.js";

/**
 * Translates board stage events into GetLead pushes. GetLead is outbound-only
 * and keyed on the board column; it resolves its own status through the org's
 * mapping and pushes nothing when a column is unmapped.
 */
export async function handleGetLeadEvent(
  event: IntegrationEvent,
  { orgId }: IntegrationEventContext,
) {
  if (event.type !== "lead.created" && event.type !== "lead.stage_changed") return;

  const { lead, stage, contact, origin } = event;
  if (origin === "integration") return;
  if (stage.pipelineType !== LEADS_PIPELINE_TYPE) return;

  // The push is an upsert either way, but the two are separate subscriptions
  // an org toggles independently, so a lead arriving on the board must not be
  // reported as a stage change.
  const trigger =
    event.type === "lead.created" ? GetLeadTriggers.LEAD_CREATE : GetLeadTriggers.LEAD_UPDATE;

  await addGetLeadSyncToQueue(
    trigger,
    orgId,
    {
      name: contact?.name ?? lead.name,
      email: contact?.email ?? lead.email,
      phone: contact?.phone ?? lead.phone,
      notes: contact?.notes ?? null,
      stageId: stage.id,
      stageName: stage.name,
      // Not pushed to GetLead — only so a phoneless lead's skip names the
      // channel it came from. INSTAGRAM and MESSENGER leads never have one.
      leadSource: lead.source,
    },
    { rateupLeadId: lead.id, ...(contact && { rateupContactId: contact.id }) },
  );
}
