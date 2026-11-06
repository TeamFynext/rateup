import type { AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { IntegrationEvent } from "../events/integrationEvent.types.js";
import type {
  IntegrationEventContext,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import {
  loadClosedConversationNote,
  loadSurveyResponseNote,
  type NoteContact,
} from "../shared/activityNotes.js";
import { findLinkByRateupId, hashSyncPayload, recordLink } from "../shared/entityLink.js";
import { hubSpotClientFor } from "./hubspot.auth.js";
import { HUBSPOT_JOB_OPTIONS, hubSpotContactIdFor } from "./hubspot.contacts.js";
import { readHubSpotCredential } from "./hubspot.types.js";

// The notes' content is shared with the other CRMs; re-exported for existing callers.
export {
  conversationNote,
  surveyNote,
  transcriptText,
  TRANSCRIPT_LIMIT,
  type ConversationNoteInput,
  type SurveyNoteInput,
} from "../shared/activityNotes.js";

/**
 * Closed conversations and survey responses, as notes on the HubSpot contact
 * (step 2.5). Each is written once: the note's id is kept as a link on the
 * conversation (per close — a reopened conversation closed again gets another
 * note) or on the response. The notes themselves are rendered in
 * `shared/activityNotes.ts`.
 */

export const HUBSPOT_NOTE = "note";

/** HubSpot's built-in association type for note → contact. */
const NOTE_TO_CONTACT = 202;

export type HubSpotNoteJobData =
  | { kind: "conversation"; contactId: string }
  | { kind: "survey"; contactId: string; responseId: string };

export async function handleHubSpotNoteEvent(
  event: IntegrationEvent,
  { orgId, integration }: IntegrationEventContext,
) {
  if (!integration) return;
  let data: HubSpotNoteJobData;
  if (event.type === "conversation.closed") {
    data = { kind: "conversation", contactId: event.contact.id };
  } else if (event.type === "survey.response_submitted") {
    // An anonymous response has no contact to put the note on.
    if (!event.response.contactId) return;
    data = {
      kind: "survey",
      contactId: event.response.contactId,
      responseId: event.response.id,
    };
  } else {
    return;
  }
  const job: ProviderJobData<HubSpotNoteJobData> = {
    integrationName: IntegratedApps.hubspot,
    triggerKey: HUBSPOT_NOTE,
    orgId,
    data,
    rateupContactId: data.contactId,
  };
  await integrationTriggerQueue.add(`hubspot-${HUBSPOT_NOTE}`, job, HUBSPOT_JOB_OPTIONS);
}

export type HubSpotNoteOutcome = "log_off" | "not_found" | "duplicate" | "no_contact" | "logged";

export async function processHubSpotNoteJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<HubSpotNoteOutcome> {
  const credential = readHubSpotCredential(integration.credential);
  const data = job.data as HubSpotNoteJobData;
  if (
    data.kind === "conversation" ? !credential?.logConversations : !credential?.logSurveyResponses
  ) {
    return "log_off";
  }
  return data.kind === "conversation"
    ? logConversation(integration, data.contactId)
    : logSurveyResponse(integration, data.responseId);
}

async function logConversation(integration: Integration, contactId: string) {
  const note = await loadClosedConversationNote(integration.orgId, contactId);
  if (!note) return "not_found";

  const key = { integrationId: integration.id, entityType: "conversation-note" };
  const closeMark = { closedAt: note.at.toISOString() };
  const link = await findLinkByRateupId(key, note.id);
  if (link?.lastSyncHash === hashSyncPayload(closeMark)) return "duplicate";

  const client = await hubSpotClientFor(integration);
  const noteId = await writeNote(client, integration, note.contact, note.body, note.at);
  if (!noteId) return "no_contact";
  await recordLink(key, { rateupId: note.id, externalId: noteId, payload: closeMark });
  return "logged";
}

async function logSurveyResponse(integration: Integration, responseId: string) {
  const note = await loadSurveyResponseNote(integration.orgId, responseId);
  if (!note) return "not_found";
  const key = { integrationId: integration.id, entityType: "survey-note" };
  if (await findLinkByRateupId(key, note.id)) return "duplicate";

  const client = await hubSpotClientFor(integration);
  const noteId = await writeNote(client, integration, note.contact, note.body, note.at);
  if (!noteId) return "no_contact";
  await recordLink(key, { rateupId: note.id, externalId: noteId });
  return "logged";
}

/**
 * Writes the note on the person's HubSpot contact, found or created as for a deal.
 * Null when the RateUp contact has neither email nor phone, so HubSpot has nobody
 * to put it on.
 */
async function writeNote(
  client: AxiosInstance,
  integration: Integration,
  contact: NoteContact,
  body: string,
  at: Date,
): Promise<string | null> {
  const hubSpotContactId = await hubSpotContactIdFor(integration, client, contact);
  if (!hubSpotContactId) return null;
  const response = await client.post<{ id: string }>("/crm/v3/objects/notes", {
    properties: { hs_timestamp: at.toISOString(), hs_note_body: body },
    associations: [
      {
        to: { id: hubSpotContactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: NOTE_TO_CONTACT }],
      },
    ],
  });
  return response.data.id;
}
