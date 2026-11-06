import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { set: vi.fn(), del: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/activityNotes.js", () => ({
  loadClosedConversationNote: vi.fn(),
  loadSurveyResponseNote: vi.fn(),
}));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  findLinkByRateupId: vi.fn(),
  recordLink: vi.fn(),
}));
vi.mock("./pipedrive.contacts.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pipedrive.contacts.js")>()),
  pipedrivePersonIdFor: vi.fn(),
}));

const client = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("./pipedrive.client.js", () => ({ pipedriveClientFor: vi.fn(async () => client) }));

import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { loadClosedConversationNote, loadSurveyResponseNote } from "../shared/activityNotes.js";
import { findLinkByRateupId, hashSyncPayload, recordLink } from "../shared/entityLink.js";
import { PIPEDRIVE_JOB_OPTIONS, pipedrivePersonIdFor } from "./pipedrive.contacts.js";
import {
  handlePipedriveNoteEvent,
  PIPEDRIVE_NOTE,
  pipedriveTime,
  processPipedriveNoteJob,
} from "./pipedrive.notes.js";

type Mock = ReturnType<typeof vi.fn>;
const loadConversation = loadClosedConversationNote as unknown as Mock;
const loadSurvey = loadSurveyResponseNote as unknown as Mock;
const findLink = findLinkByRateupId as unknown as Mock;
const personIdFor = pipedrivePersonIdFor as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      apiDomain: "https://acme.pipedrive.com",
      companyId: 9100,
      logConversations: true,
      logSurveyResponses: true,
      ...credential,
    },
  }) as never;

const CONTACT = { id: "c-1", name: "Asha", email: "asha@example.com", phone: "919876543210" };
const CLOSED_AT = new Date("2026-10-07T09:30:15.000Z");

const conversationJob = {
  integrationName: "pipedrive",
  triggerKey: PIPEDRIVE_NOTE,
  orgId: "org-1",
  data: { kind: "conversation", contactId: "c-1" },
};
const surveyJob = {
  ...conversationJob,
  data: { kind: "survey", contactId: "c-1", responseId: "r-1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  loadConversation.mockResolvedValue({
    id: "conv-1",
    at: CLOSED_AT,
    contact: CONTACT,
    body: "<p>closed</p>",
  });
  loadSurvey.mockResolvedValue({
    id: "r-1",
    at: CLOSED_AT,
    contact: CONTACT,
    body: "<p>survey</p>",
  });
  findLink.mockResolvedValue(null);
  personIdFor.mockResolvedValue(77);
  client.post.mockResolvedValue({ data: { data: { id: 3001 } } });
});

test("a note's time is in Pipedrive's UTC format", () => {
  expect(pipedriveTime(CLOSED_AT)).toBe("2026-10-07 09:30:15");
});

describe("queuing a note", () => {
  const context = { orgId: "org-1", integration: integration() } as never;

  test("a closed conversation and a survey response each queue one note", async () => {
    await handlePipedriveNoteEvent(
      { type: "conversation.closed", contact: { id: "c-1" } } as never,
      context,
    );
    await handlePipedriveNoteEvent(
      { type: "survey.response_submitted", response: { id: "r-1", contactId: "c-1" } } as never,
      context,
    );
    expect(addJob).toHaveBeenNthCalledWith(
      1,
      "pipedrive-note",
      expect.objectContaining({ data: { kind: "conversation", contactId: "c-1" } }),
      PIPEDRIVE_JOB_OPTIONS,
    );
    expect(addJob.mock.calls[1][1].data).toEqual({
      kind: "survey",
      contactId: "c-1",
      responseId: "r-1",
    });
  });

  test("an anonymous survey response queues nothing", async () => {
    await handlePipedriveNoteEvent(
      { type: "survey.response_submitted", response: { id: "r-1", contactId: null } } as never,
      context,
    );
    expect(addJob).not.toHaveBeenCalled();
  });
});

describe("logging a closed conversation", () => {
  test("writes the note on the person at the close time, and remembers the close", async () => {
    expect(await processPipedriveNoteJob(integration(), conversationJob)).toBe("logged");

    expect(loadConversation).toHaveBeenCalledWith("org-1", "c-1");
    expect(client.post).toHaveBeenCalledWith("/v1/notes", {
      content: "<p>closed</p>",
      person_id: 77,
      add_time: "2026-10-07 09:30:15",
    });
    expect(recordLink).toHaveBeenCalledWith(
      { integrationId: "int-1", entityType: "conversation-note" },
      { rateupId: "conv-1", externalId: "3001", payload: { closedAt: CLOSED_AT.toISOString() } },
    );
  });

  test("the same close is logged once", async () => {
    findLink.mockResolvedValue({
      lastSyncHash: hashSyncPayload({ closedAt: CLOSED_AT.toISOString() }),
    });
    expect(await processPipedriveNoteJob(integration(), conversationJob)).toBe("duplicate");
    expect(client.post).not.toHaveBeenCalled();
  });

  test("nothing is logged while the switch is off", async () => {
    expect(
      await processPipedriveNoteJob(integration({ logConversations: false }), conversationJob),
    ).toBe("log_off");
    expect(loadConversation).not.toHaveBeenCalled();
  });

  test("a contact Pipedrive cannot hold gets no note", async () => {
    personIdFor.mockResolvedValue(null);
    expect(await processPipedriveNoteJob(integration(), conversationJob)).toBe("no_contact");
    expect(client.post).not.toHaveBeenCalled();
  });

  test("a conversation that is not this org's is not logged", async () => {
    loadConversation.mockResolvedValue(null);
    expect(await processPipedriveNoteJob(integration(), conversationJob)).toBe("not_found");
  });
});

describe("logging a survey response", () => {
  test("logged once, without loading it again", async () => {
    expect(await processPipedriveNoteJob(integration(), surveyJob)).toBe("logged");
    expect(recordLink).toHaveBeenCalledWith(
      { integrationId: "int-1", entityType: "survey-note" },
      { rateupId: "r-1", externalId: "3001" },
    );

    vi.clearAllMocks();
    findLink.mockResolvedValue({ externalId: "3001" });
    expect(await processPipedriveNoteJob(integration(), surveyJob)).toBe("duplicate");
    expect(loadSurvey).not.toHaveBeenCalled();
  });

  test("nothing is logged while the switch is off", async () => {
    expect(
      await processPipedriveNoteJob(integration({ logSurveyResponses: false }), surveyJob),
    ).toBe("log_off");
  });
});
