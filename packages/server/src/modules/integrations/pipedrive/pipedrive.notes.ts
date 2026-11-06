import type { Integration } from "../../../generated/prisma/client.js";
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
  type LoadedNote,
} from "../shared/activityNotes.js";
import { findLinkByRateupId, hashSyncPayload, recordLink } from "../shared/entityLink.js";
import { pipedriveClientFor } from "./pipedrive.client.js";
import { PIPEDRIVE_JOB_OPTIONS, pipedrivePersonIdFor } from "./pipedrive.contacts.js";
import { readPipedriveCredential } from "./pipedrive.types.js";

/**
 * Closed conversations and survey responses, as notes on the Pipedrive person
 * (step 5.5), with the same content as HubSpot's (`shared/activityNotes.ts`).
 * Each is written once: the note's id is kept as a link on the conversation (per
 * close — a reopened conversation closed again gets another note) or on the
 * response. Notes have no v2 API yet, so they go through v1.
 */

export const PIPEDRIVE_NOTE = "note";

export type PipedriveNoteJobData =
  | { kind: "conversation"; contactId: string }
  | { kind: "survey"; contactId: string; responseId: string };

export async function handlePipedriveNoteEvent(
  event: IntegrationEvent,
  { orgId, integration }: IntegrationEventContext,
) {
  if (!integration) return;
  let data: PipedriveNoteJobData;
  if (event.type === "conversation.closed") {
    data = { kind: "conversation", contactId: event.contact.id };
  } else if (event.type === "survey.response_submitted") {
    // An anonymous response has no person to put the note on.
    if (!event.response.contactId) return;
    data = { kind: "survey", contactId: event.response.contactId, responseId: event.response.id };
  } else {
    return;
  }
  const job: ProviderJobData<PipedriveNoteJobData> = {
    integrationName: IntegratedApps.pipedrive,
    triggerKey: PIPEDRIVE_NOTE,
    orgId,
    data,
    rateupContactId: data.contactId,
  };
  await integrationTriggerQueue.add(`pipedrive-${PIPEDRIVE_NOTE}`, job, PIPEDRIVE_JOB_OPTIONS);
}

export type PipedriveNoteOutcome = "log_off" | "not_found" | "duplicate" | "no_contact" | "logged";

export async function processPipedriveNoteJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<PipedriveNoteOutcome> {
  const credential = readPipedriveCredential(integration.credential);
  const data = job.data as PipedriveNoteJobData;

  if (data.kind === "conversation") {
    if (!credential?.logConversations) return "log_off";
    const note = await loadClosedConversationNote(integration.orgId, data.contactId);
    if (!note) return "not_found";
    const key = { integrationId: integration.id, entityType: "conversation-note" };
    const closeMark = { closedAt: note.at.toISOString() };
    const link = await findLinkByRateupId(key, note.id);
    if (link?.lastSyncHash === hashSyncPayload(closeMark)) return "duplicate";
    const noteId = await writeNote(integration, note);
    if (!noteId) return "no_contact";
    await recordLink(key, { rateupId: note.id, externalId: noteId, payload: closeMark });
    return "logged";
  }

  if (!credential?.logSurveyResponses) return "log_off";
  const key = { integrationId: integration.id, entityType: "survey-note" };
  if (await findLinkByRateupId(key, data.responseId)) return "duplicate";
  const note = await loadSurveyResponseNote(integration.orgId, data.responseId);
  if (!note) return "not_found";
  const noteId = await writeNote(integration, note);
  if (!noteId) return "no_contact";
  await recordLink(key, { rateupId: note.id, externalId: noteId });
  return "logged";
}

/** Pipedrive's note time: UTC, `YYYY-MM-DD HH:MM:SS`. */
export const pipedriveTime = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

/**
 * Writes the note on the person, found or created as for a deal. Null when the
 * RateUp contact has neither email nor phone, so Pipedrive has nobody to put it on.
 */
async function writeNote(integration: Integration, note: LoadedNote): Promise<string | null> {
  const client = await pipedriveClientFor(integration);
  const personId = await pipedrivePersonIdFor(integration, client, note.contact);
  if (personId === null) return null;
  const response = await client.post<{ data: { id: number } }>("/v1/notes", {
    content: note.body,
    person_id: personId,
    add_time: pipedriveTime(note.at),
  });
  return String(response.data.data.id);
}
