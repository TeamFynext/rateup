import type { AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { IntegrationEvent } from "../events/integrationEvent.types.js";
import type {
  IntegrationEventContext,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import { findLinkByRateupId, hashSyncPayload, recordLink } from "../shared/entityLink.js";
import { hubSpotClientFor } from "./hubspot.auth.js";
import { HUBSPOT_JOB_OPTIONS, hubSpotContactIdFor } from "./hubspot.contacts.js";
import { readHubSpotCredential } from "./hubspot.types.js";

/**
 * Closed conversations and survey responses, as notes on the HubSpot contact
 * (step 2.5). Each is written once: the note's id is kept as a link on the
 * conversation (per close — a reopened conversation closed again gets another
 * note) or on the response.
 */

export const HUBSPOT_NOTE = "note";

/** HubSpot's built-in association type for note → contact. */
const NOTE_TO_CONTACT = 202;

/** The transcript keeps the conversation's last this-many messages. */
export const TRANSCRIPT_LIMIT = 50;

/** HubSpot caps a note's body; this leaves room for the markup around the text. */
const MAX_NOTE_LENGTH = 60_000;

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

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

const CLOSE_REASONS: Record<string, string> = {
  MANUAL: "Closed by an agent",
  AUTOMATION_IDLE: "Closed automatically after inactivity",
  RULE: "Closed by an automation rule",
  SPAM: "Marked as spam",
};

const RESOLUTIONS: Record<string, string> = {
  RESOLVED: "Resolved",
  ANSWERED: "Answered",
  NO_RESPONSE: "No response",
  DUPLICATE: "Duplicate",
};

async function logConversation(integration: Integration, contactId: string) {
  // The event names the contact; the conversation it closed is its latest closed one.
  const conversation = await prisma.conversation.findFirst({
    where: { contactId, closedAt: { not: null } },
    orderBy: { closedAt: "desc" },
    select: {
      id: true,
      orgId: true,
      number: true,
      subject: true,
      description: true,
      closeReason: true,
      resolutionResult: true,
      closedAt: true,
      createdAt: true,
      messageCount: true,
      closedByUser: { select: { name: true } },
      contact: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!conversation?.closedAt || conversation.orgId !== integration.orgId) return "not_found";

  const key = { integrationId: integration.id, entityType: "conversation-note" };
  const closeMark = { closedAt: conversation.closedAt.toISOString() };
  const link = await findLinkByRateupId(key, conversation.id);
  if (link?.lastSyncHash === hashSyncPayload(closeMark)) return "duplicate";

  const messages = await prisma.waMessage.findMany({
    where: { conversationId: conversation.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: TRANSCRIPT_LIMIT,
    select: {
      messageBody: true,
      waCreatedAt: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
  });

  const body = conversationNote({
    ...conversation,
    closedAt: conversation.closedAt,
    closedBy: conversation.closedByUser?.name ?? null,
    messages: messages.reverse().map((message) => ({
      at: message.waCreatedAt ?? message.createdAt,
      from: isIncoming(message.messageBody) ? "Customer" : (message.sender?.name ?? "RateUp"),
      text: transcriptText(message.messageBody),
    })),
  });

  const client = await hubSpotClientFor(integration);
  const noteId = await writeNote(
    client,
    integration,
    conversation.contact,
    body,
    conversation.closedAt,
  );
  if (!noteId) return "no_contact";
  await recordLink(key, { rateupId: conversation.id, externalId: noteId, payload: closeMark });
  return "logged";
}

export interface ConversationNoteInput {
  number: number;
  subject: string | null;
  description: string | null;
  closeReason: string | null;
  resolutionResult: string | null;
  createdAt: Date;
  closedAt: Date;
  closedBy: string | null;
  messageCount: number;
  messages: { at: Date; from: string; text: string }[];
}

/** The note's HTML: the conversation's facts, then its last messages. */
export function conversationNote(input: ConversationNoteInput): string {
  const facts: [string, string | null][] = [
    ["Closed by", input.closedBy],
    ["Reason", input.closeReason ? (CLOSE_REASONS[input.closeReason] ?? input.closeReason) : null],
    [
      "Resolution",
      input.resolutionResult
        ? (RESOLUTIONS[input.resolutionResult] ?? input.resolutionResult)
        : null,
    ],
    ["Subject", input.subject],
    ["Description", input.description],
    ["Opened", stamp(input.createdAt)],
    ["Closed", stamp(input.closedAt)],
    ["Messages", String(input.messageCount)],
  ];
  const lines = [
    `<p><strong>WhatsApp conversation #${input.number} closed</strong></p>`,
    `<p>${facts
      .filter((fact): fact is [string, string] => !!fact[1])
      .map(([label, value]) => `${label}: ${escapeHtml(value)}`)
      .join("<br>")}</p>`,
  ];
  if (input.messages.length) {
    const shown =
      input.messageCount > input.messages.length
        ? `Last ${input.messages.length} messages`
        : "Messages";
    lines.push(
      `<p><strong>${shown}</strong><br>${input.messages
        .map(
          (message) =>
            `[${stamp(message.at)}] ${escapeHtml(message.from)}: ${escapeHtml(message.text)}`,
        )
        .join("<br>")}</p>`,
    );
  }
  return truncate(lines.join(""));
}

/** Customer messages are stored with `exchangeProcess: "receive"`. */
function isIncoming(body: unknown) {
  return (body as { exchangeProcess?: string } | null)?.exchangeProcess === "receive";
}

/** One message as a transcript line: its text, or what it was when it has none. */
export function transcriptText(body: unknown): string {
  if (!body || typeof body !== "object") return "[message]";
  const message = body as {
    type?: string;
    text?: { body?: unknown };
    template?: { name?: string };
    button?: { text?: string };
    interactive?: {
      button_reply?: { title?: string };
      list_reply?: { title?: string };
      body?: { text?: string };
    };
    [key: string]: unknown;
  };
  if (typeof message.text?.body === "string") return message.text.body;
  switch (message.type) {
    case "template":
      return `[template${message.template?.name ? `: ${message.template.name}` : ""}]`;
    case "button":
      return message.button?.text ?? "[button]";
    case "interactive":
      return (
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        message.interactive?.body?.text ??
        "[interactive message]"
      );
  }
  const type = message.type ?? "message";
  const caption = (message[type] as { caption?: unknown } | undefined)?.caption;
  return typeof caption === "string" && caption ? `[${type}] ${caption}` : `[${type}]`;
}

// ---------------------------------------------------------------------------
// Survey responses
// ---------------------------------------------------------------------------

async function logSurveyResponse(integration: Integration, responseId: string) {
  const response = await prisma.surveyResponse.findUnique({
    where: { id: responseId },
    select: {
      id: true,
      createdAt: true,
      platform: true,
      language: true,
      responses: true,
      encryptedResponses: true,
      surveyTeamMap: {
        select: {
          survey: { select: { title: true, questions: true } },
          team: { select: { name: true, orgId: true } },
        },
      },
      Contact: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!response?.Contact || response.surveyTeamMap.team.orgId !== integration.orgId) {
    return "not_found";
  }

  const key = { integrationId: integration.id, entityType: "survey-note" };
  if (await findLinkByRateupId(key, response.id)) return "duplicate";

  // Loaded on use: the formatting helpers sit in the heavy response module.
  const [{ getFormattedResponse }, { getContent }] = await Promise.all([
    import("../../response/response.service.js"),
    import("../../../utils/survey/response.data.js"),
  ]);
  const questions = response.surveyTeamMap.survey.questions as unknown as Question[];
  const language = response.language || Object.keys(questions[0]?.title ?? {})[0] || "en";
  const answers = response.encryptedResponses
    ? null
    : (response.responses as unknown as QuestionResponse[]).flatMap((answer) => {
        const question = questions.find((q) => q.id === answer.questionId);
        if (!question) return [];
        const title =
          question.title?.[language] ||
          question.description?.[language] ||
          question.label?.[language] ||
          "";
        const value = getFormattedResponse(answer.response, question, language);
        const text = typeof value === "string" ? value : String(value ?? "");
        return text.trim() ? [{ question: getContent(title).trim(), answer: text.trim() }] : [];
      });

  const body = surveyNote({
    survey: response.surveyTeamMap.survey.title,
    team: response.surveyTeamMap.team.name,
    platform: response.platform,
    createdAt: response.createdAt,
    answers,
  });

  const client = await hubSpotClientFor(integration);
  const noteId = await writeNote(client, integration, response.Contact, body, response.createdAt);
  if (!noteId) return "no_contact";
  await recordLink(key, { rateupId: response.id, externalId: noteId });
  return "logged";
}

export interface SurveyNoteInput {
  survey: string;
  team: string;
  platform: string;
  createdAt: Date;
  /** Null when the answers are encrypted and must stay in RateUp. */
  answers: { question: string; answer: string }[] | null;
}

export function surveyNote(input: SurveyNoteInput): string {
  const lines = [
    `<p><strong>Survey response: ${escapeHtml(input.survey)}</strong></p>`,
    `<p>Team: ${escapeHtml(input.team)}<br>Channel: ${escapeHtml(
      input.platform === "WHATSAPP"
        ? "WhatsApp"
        : input.platform === "WEB"
          ? "Web"
          : input.platform,
    )}<br>Submitted: ${stamp(input.createdAt)}</p>`,
  ];
  if (input.answers === null) {
    lines.push("<p>The answers are encrypted and can be seen in RateUp.</p>");
  } else if (!input.answers.length) {
    lines.push("<p>The answers can be seen in RateUp.</p>");
  } else {
    lines.push(
      `<p>${input.answers
        .map(
          ({ question, answer }) =>
            `<strong>${escapeHtml(question || "Question")}</strong><br>${escapeHtml(answer)}`,
        )
        .join("<br><br>")}</p>`,
    );
  }
  return truncate(lines.join(""));
}

// ---------------------------------------------------------------------------

/**
 * Writes the note on the person's HubSpot contact, found or created as for a deal.
 * Null when the RateUp contact has neither email nor phone, so HubSpot has nobody
 * to put it on.
 */
async function writeNote(
  client: AxiosInstance,
  integration: Integration,
  contact: { id: string; name: string | null; email: string | null; phone: string | null },
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** A time as HubSpot readers will see it, in UTC so it reads the same for everyone. */
function stamp(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function truncate(html: string) {
  return html.length > MAX_NOTE_LENGTH ? `${html.slice(0, MAX_NOTE_LENGTH)}…` : html;
}
