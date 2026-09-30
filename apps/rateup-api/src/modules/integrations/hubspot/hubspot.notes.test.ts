import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    conversation: { findFirst: vi.fn() },
    waMessage: { findMany: vi.fn() },
    surveyResponse: { findUnique: vi.fn() },
  },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  findLinkByRateupId: vi.fn(),
  recordLink: vi.fn(),
}));
vi.mock("./hubspot.contacts.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./hubspot.contacts.js")>()),
  hubSpotContactIdFor: vi.fn(),
}));
vi.mock("../../response/response.service.js", () => ({
  getFormattedResponse: vi.fn((response: unknown) => String(response)),
}));
vi.mock("../../../utils/survey/response.data.js", () => ({
  getContent: (title: string) => title.replace(/<[^>]+>/g, ""),
}));

const client = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("./hubspot.auth.js", () => ({ hubSpotClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { findLinkByRateupId, hashSyncPayload, recordLink } from "../shared/entityLink.js";
import { HUBSPOT_JOB_OPTIONS, hubSpotContactIdFor } from "./hubspot.contacts.js";
import {
  conversationNote,
  handleHubSpotNoteEvent,
  HUBSPOT_NOTE,
  processHubSpotNoteJob,
  surveyNote,
  transcriptText,
} from "./hubspot.notes.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const findLink = findLinkByRateupId as unknown as Mock;
const contactIdFor = hubSpotContactIdFor as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      portalId: 4401,
      logConversations: true,
      logSurveyResponses: true,
      ...credential,
    },
  }) as never;

const CONTACT = { id: "c-1", name: "Asha Nair", email: "asha@example.com", phone: "919876543210" };
const CLOSED_AT = new Date("2026-09-30T10:15:00.000Z");

const conversation = (over: Record<string, unknown> = {}) => ({
  id: "conv-1",
  orgId: "org-1",
  number: 123,
  subject: "Order <late>",
  description: null,
  closeReason: "MANUAL",
  resolutionResult: "RESOLVED",
  closedAt: CLOSED_AT,
  createdAt: new Date("2026-09-30T09:00:00.000Z"),
  messageCount: 2,
  closedByUser: { name: "Sam" },
  contact: CONTACT,
  ...over,
});

const conversationJob = {
  integrationName: "hubspot",
  triggerKey: HUBSPOT_NOTE,
  orgId: "org-1",
  data: { kind: "conversation", contactId: "c-1" },
};
const surveyJob = {
  integrationName: "hubspot",
  triggerKey: HUBSPOT_NOTE,
  orgId: "org-1",
  data: { kind: "survey", contactId: "c-1", responseId: "resp-1" },
};

const response = (over: Record<string, unknown> = {}) => ({
  id: "resp-1",
  createdAt: new Date("2026-09-30T11:00:00.000Z"),
  platform: "WHATSAPP",
  language: "en",
  responses: [
    { questionId: "q1", type: "rating", response: 9 },
    { questionId: "gone", type: "text", response: "orphan" },
  ],
  encryptedResponses: null,
  surveyTeamMap: {
    survey: {
      title: "After-visit survey",
      questions: [
        { id: "q1", type: "rating", title: { en: "<p>How likely…?</p>" }, description: {} },
      ],
    },
    team: { name: "Kochi", orgId: "org-1" },
  },
  Contact: CONTACT,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  findLink.mockResolvedValue(null);
  contactIdFor.mockResolvedValue("701");
  client.post.mockResolvedValue({ data: { id: "note-1" } });
  db.conversation.findFirst.mockResolvedValue(conversation());
  db.waMessage.findMany.mockResolvedValue([
    // Newest first, as the query asks for them.
    {
      messageBody: { type: "text", text: { body: "It's on the way" } },
      waCreatedAt: new Date("2026-09-30T09:05:00.000Z"),
      createdAt: new Date(),
      sender: { name: "Sam" },
    },
    {
      messageBody: {
        type: "text",
        text: { body: "Where is my order?" },
        exchangeProcess: "receive",
      },
      waCreatedAt: new Date("2026-09-30T09:01:00.000Z"),
      createdAt: new Date(),
      sender: null,
    },
  ]);
  db.surveyResponse.findUnique.mockResolvedValue(response());
});

describe("a message as a transcript line", () => {
  test("text as it is, media by type with any caption, templates by name", () => {
    expect(transcriptText({ type: "text", text: { body: "Hi" } })).toBe("Hi");
    expect(transcriptText({ type: "image", image: { caption: "receipt" } })).toBe(
      "[image] receipt",
    );
    expect(transcriptText({ type: "audio", audio: {} })).toBe("[audio]");
    expect(transcriptText({ type: "template", template: { name: "order_update" } })).toBe(
      "[template: order_update]",
    );
    expect(
      transcriptText({ type: "interactive", interactive: { button_reply: { title: "Yes" } } }),
    ).toBe("Yes");
  });
});

describe("the notes' content", () => {
  test("a conversation note: its facts, then the messages, all escaped", () => {
    const html = conversationNote({
      number: 123,
      subject: "Order <late>",
      description: null,
      closeReason: "AUTOMATION_IDLE",
      resolutionResult: null,
      createdAt: new Date("2026-09-30T09:00:00.000Z"),
      closedAt: CLOSED_AT,
      closedBy: null,
      messageCount: 80,
      messages: [{ at: new Date("2026-09-30T09:01:00.000Z"), from: "Customer", text: "a < b" }],
    });
    expect(html).toContain("WhatsApp conversation #123 closed");
    expect(html).toContain("Reason: Closed automatically after inactivity");
    expect(html).toContain("Subject: Order &lt;late&gt;");
    expect(html).not.toContain("Resolution:");
    expect(html).toContain("Last 1 messages");
    expect(html).toContain("[2026-09-30 09:01 UTC] Customer: a &lt; b");
  });

  test("an encrypted survey response says so and carries no answers", () => {
    const html = surveyNote({
      survey: "NPS",
      team: "Kochi",
      platform: "WEB",
      createdAt: CLOSED_AT,
      answers: null,
    });
    expect(html).toContain("Survey response: NPS");
    expect(html).toContain("Channel: Web");
    expect(html).toContain("encrypted");
  });
});

describe("queuing a note", () => {
  const context = { orgId: "org-1", integration: integration() };

  test("a closed conversation and a survey response each queue one note", async () => {
    await handleHubSpotNoteEvent(
      { type: "conversation.closed", contact: { id: "c-1", orgId: "org-1" } },
      context,
    );
    await handleHubSpotNoteEvent(
      {
        type: "survey.response_submitted",
        response: { id: "resp-1", contactId: "c-1", platform: "WEB", createdAt: "2026-09-30" },
      },
      context,
    );
    expect(addJob.mock.calls.map((call) => call[1].data)).toEqual([
      { kind: "conversation", contactId: "c-1" },
      { kind: "survey", contactId: "c-1", responseId: "resp-1" },
    ]);
    expect(addJob.mock.calls[0][2]).toBe(HUBSPOT_JOB_OPTIONS);
  });
});

describe("logging a closed conversation", () => {
  test("writes the note on the contact, messages oldest first, and remembers the close", async () => {
    await expect(processHubSpotNoteJob(integration(), conversationJob)).resolves.toBe("logged");

    const [path, payload] = client.post.mock.calls[0];
    expect(path).toBe("/crm/v3/objects/notes");
    expect(payload.properties.hs_timestamp).toBe(CLOSED_AT.toISOString());
    expect(payload.associations).toEqual([
      {
        to: { id: "701" },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
      },
    ]);
    const body: string = payload.properties.hs_note_body;
    expect(body.indexOf("Where is my order?")).toBeLessThan(body.indexOf("It's on the way"));
    expect(body).toContain("Customer: Where is my order?");
    expect(body).toContain("Sam: It's on the way");
    expect(recordLink).toHaveBeenCalledWith(
      { integrationId: "int-1", entityType: "conversation-note" },
      { rateupId: "conv-1", externalId: "note-1", payload: { closedAt: CLOSED_AT.toISOString() } },
    );
  });

  test("the same close is logged once; closing again after a reopen logs again", async () => {
    findLink.mockResolvedValue({
      lastSyncHash: hashSyncPayload({ closedAt: CLOSED_AT.toISOString() }),
    });
    await expect(processHubSpotNoteJob(integration(), conversationJob)).resolves.toBe("duplicate");
    expect(client.post).not.toHaveBeenCalled();

    findLink.mockResolvedValue({ lastSyncHash: hashSyncPayload({ closedAt: "earlier" }) });
    await expect(processHubSpotNoteJob(integration(), conversationJob)).resolves.toBe("logged");
  });

  test("nothing is logged while the switch is off", async () => {
    await expect(
      processHubSpotNoteJob(integration({ logConversations: false }), conversationJob),
    ).resolves.toBe("log_off");
    expect(db.conversation.findFirst).not.toHaveBeenCalled();
  });

  test("a contact HubSpot cannot hold gets no note", async () => {
    contactIdFor.mockResolvedValue(null);
    await expect(processHubSpotNoteJob(integration(), conversationJob)).resolves.toBe("no_contact");
    expect(client.post).not.toHaveBeenCalled();
    expect(recordLink).not.toHaveBeenCalled();
  });
});

describe("logging a survey response", () => {
  test("lists each answered question with its answer, once", async () => {
    await expect(processHubSpotNoteJob(integration(), surveyJob)).resolves.toBe("logged");

    const body: string = client.post.mock.calls[0][1].properties.hs_note_body;
    expect(body).toContain("Survey response: After-visit survey");
    expect(body).toContain("Channel: WhatsApp");
    expect(body).toContain("<strong>How likely…?</strong><br>9");
    expect(body).not.toContain("orphan");
    expect(recordLink).toHaveBeenCalledWith(
      { integrationId: "int-1", entityType: "survey-note" },
      { rateupId: "resp-1", externalId: "note-1" },
    );

    findLink.mockResolvedValue({ externalId: "note-1" });
    await expect(processHubSpotNoteJob(integration(), surveyJob)).resolves.toBe("duplicate");
  });

  test("encrypted answers never leave RateUp", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(response({ encryptedResponses: "cipher" }));
    await processHubSpotNoteJob(integration(), surveyJob);
    const body: string = client.post.mock.calls[0][1].properties.hs_note_body;
    expect(body).toContain("encrypted");
    expect(body).not.toContain("How likely");
  });

  test("a response from another org is not logged", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(
      response({
        surveyTeamMap: { ...response().surveyTeamMap, team: { name: "X", orgId: "org-2" } },
      }),
    );
    await expect(processHubSpotNoteJob(integration(), surveyJob)).resolves.toBe("not_found");
  });
});
