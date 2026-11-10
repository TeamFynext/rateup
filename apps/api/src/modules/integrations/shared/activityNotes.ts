import prisma from "../../../utils/prisma.js";
import {
  contactFields,
  primaryIdentities,
  type PrimaryIdentityRow,
} from "../../contact/identity/contactFields.js";

/**
 * Closed conversations and survey responses written up as CRM notes: the part
 * that is the same for every CRM. Each CRM decides where the note goes and how it
 * is deduplicated (`hubspot.notes.ts`, `pipedrive.notes.ts`); this loads the
 * record and renders the note's HTML.
 */

/** The transcript keeps the conversation's last this-many messages. */
export const TRANSCRIPT_LIMIT = 50;

/** CRMs cap a note's body; this leaves room for the markup around the text. */
const MAX_NOTE_LENGTH = 60_000;

/** The person a note is about, as a CRM's contact lookup takes it. */
export interface NoteContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

/** Selects what a `NoteContact` is built from; map the row with `toNoteContact`. */
export const noteContactSelect = { id: true, name: true, ...primaryIdentities } as const;

export function toNoteContact(row: {
  id: string;
  name: string | null;
  identities: PrimaryIdentityRow[];
}): NoteContact {
  const { email, phone } = contactFields(row.identities);
  return { id: row.id, name: row.name, email, phone };
}

export interface LoadedNote {
  /** The conversation's or the response's id, for the CRM's dedupe link. */
  id: string;
  /** When it happened: the close, or the submission. */
  at: Date;
  contact: NoteContact;
  body: string;
}

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

/**
 * The contact's latest closed conversation as a note, or null when there is none
 * in this org. The event names the contact; the conversation it closed is its
 * latest closed one.
 */
export async function loadClosedConversationNote(
  orgId: string | null,
  contactId: string,
): Promise<LoadedNote | null> {
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
      contact: { select: noteContactSelect },
    },
  });
  if (!conversation?.closedAt || conversation.orgId !== orgId) return null;

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
  return {
    id: conversation.id,
    at: conversation.closedAt,
    contact: toNoteContact(conversation.contact),
    body,
  };
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

/**
 * A survey response as a note, or null when it is not this org's or has no
 * contact. Encrypted answers never leave RateUp: the note only says they exist.
 */
export async function loadSurveyResponseNote(
  orgId: string | null,
  responseId: string,
): Promise<LoadedNote | null> {
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
      Contact: { select: noteContactSelect },
    },
  });
  if (!response?.Contact || response.surveyTeamMap.team.orgId !== orgId) return null;

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
  return {
    id: response.id,
    at: response.createdAt,
    contact: toNoteContact(response.Contact),
    body,
  };
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** A time as CRM readers will see it, in UTC so it reads the same for everyone. */
function stamp(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function truncate(html: string) {
  return html.length > MAX_NOTE_LENGTH ? `${html.slice(0, MAX_NOTE_LENGTH)}…` : html;
}
