import axios, { type AxiosInstance } from "axios";

import type { GetLeadIdentifier, GetLeadMeta, GetLeadWritePayload } from "./getlead.types.js";

export const GETLEAD_DEFAULT_BASE_URL = "https://v3.getleadcrm.com";

/**
 * An axios client for one org's GetLead key.
 *
 * `Accept: application/json` is not optional and is the reason this wrapper
 * exists. GetLead is a Laravel app: without it, a request that fails validation
 * answers **302 redirecting to the marketing site** — HTML, no error body, and an
 * axios call that looks like it succeeded. The API docs' own curl examples set
 * only `Content-Type`, so following them verbatim hides every validation failure.
 */
export function createGetLeadAxios(apiKey: string, baseUrl = GETLEAD_DEFAULT_BASE_URL) {
  return axios.create({
    baseURL: `${baseUrl.replace(/\/+$/, "")}/api/v1`,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // A redirect means the Accept header was lost somewhere; surfacing it as a
    // status beats silently following it to an HTML page.
    maxRedirects: 0,
  });
}

/**
 * The business's reference data: sources, statuses, purposes, custom fields.
 *
 * Doubles as the liveness check for a pasted key — it is the cheapest
 * authenticated GET, so a 401 here means the key is wrong.
 */
export async function getGetLeadMeta(client: AxiosInstance): Promise<GetLeadMeta> {
  const response = await client.get<{ data: GetLeadMeta }>("/meta");
  return response.data.data;
}

/** Creates a lead. Returns the new lead's ULID. */
export async function createGetLead(
  client: AxiosInstance,
  payload: GetLeadWritePayload,
): Promise<string> {
  const response = await client.post<{ data: { lead_id: string } }>("/leads", payload);
  return response.data.data.lead_id;
}

/** Fetches a single lead by ULID. */
export async function getGetLeadById(client: AxiosInstance, leadId: string) {
  const response = await client.get<{ data: Record<string, unknown> }>(`/leads/${leadId}`);
  return response.data.data;
}

/**
 * Partially updates a lead by id. Answers 204 with no body, so there is nothing
 * to return — omitted fields are left untouched.
 */
export async function updateGetLead(
  client: AxiosInstance,
  leadId: string,
  payload: GetLeadWritePayload,
): Promise<void> {
  await client.patch(`/leads/${leadId}`, payload);
}

/**
 * Partially updates a lead located by phone or email rather than by id, and
 * returns the id it matched so the caller can cache it.
 *
 * Throws a 404 when nothing matches — the branch that falls through to a create.
 */
export async function updateGetLeadByIdentifier(
  client: AxiosInstance,
  identifier: GetLeadIdentifier,
  payload: GetLeadWritePayload,
): Promise<string> {
  const response = await client.patch<{ data: { lead_id: string } }>("/leads/by-identifier", {
    ...identifier,
    ...payload,
  });
  return response.data.data.lead_id;
}

/** Creates a note under a lead. Returns the new note's ULID. */
export async function createGetLeadNote(
  client: AxiosInstance,
  leadId: string,
  note: { content: string; title?: string },
): Promise<string> {
  const response = await client.post<{ data: { note_id: string } }>(`/leads/${leadId}/notes`, note);
  return response.data.data.note_id;
}

/** Creates a note under a lead located by phone or email. Returns the note's ULID. */
export async function createGetLeadNoteByIdentifier(
  client: AxiosInstance,
  identifier: GetLeadIdentifier,
  note: { content: string; title?: string },
): Promise<string> {
  const response = await client.post<{ data: { note_id: string } }>("/leads/by-identifier/notes", {
    ...identifier,
    ...note,
  });
  return response.data.data.note_id;
}

/** Deletes a note under a lead. */
export async function deleteGetLeadNote(
  client: AxiosInstance,
  leadId: string,
  noteId: string,
): Promise<void> {
  await client.delete(`/leads/${leadId}/notes/${noteId}`);
}
