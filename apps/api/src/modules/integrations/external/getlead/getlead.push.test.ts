import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const contact = { findUnique: vi.fn(), update: vi.fn() };
const lead = { findUnique: vi.fn(), update: vi.fn() };
const leadActivity = { create: vi.fn() };
vi.mock("../../../../utils/prisma.js", () => ({
  default: { integration: { findUnique: vi.fn(), upsert: vi.fn() }, contact, lead, leadActivity },
}));

const client = {
  createGetLead: vi.fn(),
  updateGetLead: vi.fn(),
  updateGetLeadByIdentifier: vi.fn(),
  createGetLeadNote: vi.fn(),
};
vi.mock("./getlead.client.js", () => ({
  createGetLeadAxios: vi.fn(() => ({})),
  getGetLeadMeta: vi.fn(),
  createGetLead: (...a: unknown[]) => client.createGetLead(...a),
  updateGetLead: (...a: unknown[]) => client.updateGetLead(...a),
  updateGetLeadByIdentifier: (...a: unknown[]) => client.updateGetLeadByIdentifier(...a),
  createGetLeadNote: (...a: unknown[]) => client.createGetLeadNote(...a),
}));

const { processGetLeadJob } = await import("./getlead.push.js");
const { GetLeadTriggers } = await import("./getlead.types.js");

/** A queued job, the way the dispatcher hands one to the provider. */
function processGetLead(
  integration: never,
  triggerKey: string,
  data: never,
  orgId: string,
  rateupContactId?: string,
  rateupLeadId?: string,
) {
  return processGetLeadJob(integration, {
    integrationName: "getlead",
    triggerKey,
    data,
    orgId,
    rateupContactId,
    rateupLeadId,
  });
}

const PHONE_STORED = "919876543210";
const PHONE_E164 = "+919876543210";

function integrationWith(credential: Record<string, unknown> = {}) {
  return {
    id: "int-1",
    name: "getlead",
    active: true,
    orgId: "org-1",
    createdAt: new Date(),
    credential: {
      apiKey: "ik_live",
      triggerSubscriptions: [
        { subscribed_field: GetLeadTriggers.LEAD_UPDATE, active: true },
        { subscribed_field: GetLeadTriggers.LEAD_CREATE, active: true },
        { subscribed_field: GetLeadTriggers.NOTE_CREATE, active: true },
      ],
      ...credential,
    },
  } as never;
}

function httpError(status: number, data: unknown) {
  const error = new AxiosError("Request failed");
  error.response = {
    status,
    statusText: "",
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

const NOT_FOUND = httpError(404, { message: "Lead not found with the provided identifier" });

beforeEach(() => {
  vi.clearAllMocks();
  contact.findUnique.mockResolvedValue({ integrationIds: null });
  lead.findUnique.mockResolvedValue({ integrationIds: null });
  contact.update.mockResolvedValue({});
  lead.update.mockResolvedValue({});
  client.updateGetLeadByIdentifier.mockResolvedValue("01LEADMATCHED");
  client.createGetLead.mockResolvedValue("01LEADCREATED");
  client.updateGetLead.mockResolvedValue(undefined);
  client.createGetLeadNote.mockResolvedValue("01NOTE");
  leadActivity.create.mockResolvedValue({});
});

/** The `details` of the single activity written, or undefined if none was. */
const activityDetails = () => leadActivity.create.mock.calls[0]?.[0]?.data;

const push = (data: Record<string, unknown>, credential = {}, ids = { rateupLeadId: "lead-1" }) =>
  processGetLead(
    integrationWith(credential),
    GetLeadTriggers.LEAD_UPDATE,
    data as never,
    "org-1",
    (ids as { rateupContactId?: string }).rateupContactId,
    (ids as { rateupLeadId?: string }).rateupLeadId,
  );

describe("the upsert ordering", () => {
  test("patches by id when one is cached, without touching by-identifier", async () => {
    lead.findUnique.mockResolvedValue({
      integrationIds: { getlead: { lead: { id: "01KNOWN" } } },
    });

    await push({ name: "Jane", phone: PHONE_STORED });

    expect(client.updateGetLead).toHaveBeenCalledWith({}, "01KNOWN", expect.anything());
    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
    expect(client.createGetLead).not.toHaveBeenCalled();
  });

  test("matches by phone when no id is cached, and caches what it matched", async () => {
    await push({ name: "Jane", phone: PHONE_STORED });

    expect(client.updateGetLeadByIdentifier).toHaveBeenCalledWith(
      {},
      { phone_number: PHONE_E164 },
      expect.anything(),
    );
    expect(client.createGetLead).not.toHaveBeenCalled();
    expect(lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { integrationIds: { getlead: { lead: { id: "01LEADMATCHED" } } } },
    });
  });

  test("creates only when the identifier matches nothing", async () => {
    client.updateGetLeadByIdentifier.mockRejectedValue(NOT_FOUND);

    await push({ name: "Jane", phone: PHONE_STORED });

    expect(client.createGetLead).toHaveBeenCalled();
    expect(lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { integrationIds: { getlead: { lead: { id: "01LEADCREATED" } } } },
    });
  });

  test("re-establishes a lead that was deleted in GetLead", async () => {
    lead.findUnique.mockResolvedValue({
      integrationIds: { getlead: { lead: { id: "01GONE" } } },
    });
    client.updateGetLead.mockRejectedValue(NOT_FOUND);

    await push({ name: "Jane", phone: PHONE_STORED });

    // Without this it would fail on the same dead id forever.
    expect(client.updateGetLeadByIdentifier).toHaveBeenCalled();
  });

  test("prefers the contact over the lead as the id holder", async () => {
    contact.findUnique.mockResolvedValue({ integrationIds: null });

    await push({ name: "Jane", phone: PHONE_STORED }, {}, {
      rateupContactId: "contact-1",
      rateupLeadId: "lead-1",
    } as never);

    expect(contact.update).toHaveBeenCalled();
    expect(lead.update).not.toHaveBeenCalled();
  });
});

describe("phone handling", () => {
  test("prefixes a stored number rather than reparsing it", async () => {
    await push({ name: "Jane", phone: PHONE_STORED });

    expect(client.updateGetLeadByIdentifier).toHaveBeenCalledWith(
      {},
      { phone_number: PHONE_E164 },
      expect.objectContaining({ phone_numbers: [PHONE_E164] }),
    );
  });

  test("accepts a number that already carries its plus", async () => {
    await push({ name: "Jane", phone: PHONE_E164 });

    expect(client.updateGetLeadByIdentifier).toHaveBeenCalledWith(
      {},
      { phone_number: PHONE_E164 },
      expect.anything(),
    );
  });

  test("skips a lead with no phone instead of failing it", async () => {
    await push({ name: "Jane", phone: null });

    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
    expect(client.createGetLead).not.toHaveBeenCalled();
  });

  test("skips an Instagram lead, which has no phone by construction", async () => {
    // `getOrCreateContactByIgsId` creates the contact from an igsId alone, so
    // phone is null for every DM-sourced lead. GetLead requires one, so this is
    // a whole channel that cannot sync — not a rare data gap.
    await push({ name: "Jane", phone: null, leadSource: "INSTAGRAM" });

    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
    expect(client.createGetLead).not.toHaveBeenCalled();
  });

  test("skips a Messenger lead for the same reason", async () => {
    await push({ name: "Jane", phone: null, leadSource: "MESSENGER" });

    expect(client.createGetLead).not.toHaveBeenCalled();
  });

  test("skips an unparseable hand-typed phone", async () => {
    // `lead.schema.ts` validates board phones with nothing but a length cap.
    await push({ name: "Jane", phone: "call the office" });

    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
    expect(client.createGetLead).not.toHaveBeenCalled();
  });

  test("skips a well-shaped but undialable number, which GetLead rejects", async () => {
    // +1 999 ... is valid E.164 shape; GetLead answers `invalid_phone_number`.
    await push({ name: "Jane", phone: "19995550137" });

    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
    expect(client.createGetLead).not.toHaveBeenCalled();
  });
});

describe("status mapping", () => {
  const mapped = {
    stageMappings: [{ stageId: "stage-1", getleadStatusId: "01STATUS" }],
  };

  test("sends the mapped status for the lead's column", async () => {
    await push({ name: "Jane", phone: PHONE_STORED, stageId: "stage-1" }, mapped);

    expect(client.updateGetLeadByIdentifier).toHaveBeenCalledWith(
      {},
      expect.anything(),
      expect.objectContaining({ status_id: "01STATUS" }),
    );
  });

  test("sends no status for an unmapped column rather than guessing", async () => {
    await push({ name: "Jane", phone: PHONE_STORED, stageId: "other" }, mapped);

    const payload = client.updateGetLeadByIdentifier.mock.calls[0][2];
    expect(payload.status_id).toBeUndefined();
  });

  test("retries without the status when GetLead refuses the transition", async () => {
    client.updateGetLeadByIdentifier
      .mockRejectedValueOnce(
        httpError(422, {
          error: { code: "status_transition_must_be_valid", message: "Not allowed" },
        }),
      )
      .mockResolvedValueOnce("01LEADMATCHED");

    await push({ name: "Jane", phone: PHONE_STORED, stageId: "stage-1" }, mapped);

    // The name and email must still land; the status was always going to be
    // refused and is a configuration problem, not a transient one.
    expect(client.updateGetLeadByIdentifier).toHaveBeenCalledTimes(2);
    expect(client.updateGetLeadByIdentifier.mock.calls[1][2].status_id).toBeUndefined();
    expect(client.updateGetLeadByIdentifier.mock.calls[1][2].name).toBe("Jane");
  });
});

describe("gating and failures", () => {
  test("does nothing when the trigger is not subscribed", async () => {
    await processGetLead(
      integrationWith({ triggerSubscriptions: [] }),
      GetLeadTriggers.LEAD_UPDATE,
      { name: "Jane", phone: PHONE_STORED } as never,
      "org-1",
      undefined,
      "lead-1",
    );

    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
  });

  test("does nothing when no key is stored", async () => {
    await processGetLead(
      integrationWith({ apiKey: undefined }),
      GetLeadTriggers.LEAD_UPDATE,
      { name: "Jane", phone: PHONE_STORED } as never,
      "org-1",
      undefined,
      "lead-1",
    );

    expect(client.updateGetLeadByIdentifier).not.toHaveBeenCalled();
  });

  test("propagates a 429 so BullMQ retries it", async () => {
    client.updateGetLeadByIdentifier.mockRejectedValue(
      httpError(429, { message: "Too many requests", retry_after: 60 }),
    );

    // Swallowing this would drop the lead silently; the queue's backoff is what
    // gets it delivered after the window resets.
    await expect(push({ name: "Jane", phone: PHONE_STORED })).rejects.toBeTruthy();
  });

  test("a note push attaches to the lead it just ensured exists", async () => {
    await processGetLead(
      integrationWith(),
      GetLeadTriggers.NOTE_CREATE,
      { name: "Jane", phone: PHONE_STORED, notes: "Called back" } as never,
      "org-1",
      undefined,
      "lead-1",
    );

    expect(client.createGetLeadNote).toHaveBeenCalledWith({}, "01LEADMATCHED", {
      content: "Called back",
    });
  });
});

describe("the lead timeline", () => {
  test("records a sync, naming the GetLead record it landed in", async () => {
    await push({ name: "Jane", phone: PHONE_STORED, stageName: "Qualified" });

    expect(activityDetails()).toMatchObject({
      leadId: "lead-1",
      userId: null,
      type: "INTEGRATION_SYNCED",
      details: {
        automated: true,
        integrationName: "GetLead",
        externalId: "01LEADMATCHED",
        toStageName: "Qualified",
      },
    });
  });

  test("distinguishes opening a record from updating one", async () => {
    client.updateGetLeadByIdentifier.mockRejectedValue(NOT_FOUND);

    await push({ name: "Jane", phone: PHONE_STORED });

    expect(activityDetails().details.externalCreated).toBe(true);
  });

  test("records a skip with a reason and the channel that caused it", async () => {
    await push({ name: "Jane", phone: null, leadSource: "INSTAGRAM" });

    // Without this the only trace is a server log the org cannot see, and an
    // Instagram lead simply never appears in GetLead with no explanation.
    expect(activityDetails()).toMatchObject({
      leadId: "lead-1",
      type: "INTEGRATION_SKIPPED",
      details: { skipReason: "NO_PHONE", sourceLabel: "INSTAGRAM" },
    });
  });

  test("flags a synced lead whose status the workflow refused", async () => {
    client.updateGetLeadByIdentifier
      .mockRejectedValueOnce(
        httpError(422, {
          error: { code: "status_transition_must_be_valid", message: "Not allowed" },
        }),
      )
      .mockResolvedValueOnce("01LEADMATCHED");

    await push(
      { name: "Jane", phone: PHONE_STORED, stageId: "stage-1" },
      { stageMappings: [{ stageId: "stage-1", getleadStatusId: "01STATUS" }] },
    );

    // The lead synced but its stage did not — a mapping the org must fix, so it
    // has to be visible rather than a warn line.
    expect(activityDetails().details.statusRejected).toBe(true);
  });

  test("writes nothing when there is no Rateup lead to hang it on", async () => {
    await processGetLead(
      integrationWith(),
      GetLeadTriggers.LEAD_UPDATE,
      { name: "Jane", phone: PHONE_STORED } as never,
      "org-1",
      "contact-1",
      undefined,
    );

    expect(leadActivity.create).not.toHaveBeenCalled();
  });

  test("a failed timeline write never fails the sync that already happened", async () => {
    leadActivity.create.mockRejectedValue(new Error("db down"));

    // Throwing here would retry the job and push the same lead a second time.
    await expect(push({ name: "Jane", phone: PHONE_STORED })).resolves.toBeUndefined();
    expect(client.updateGetLeadByIdentifier).toHaveBeenCalled();
  });
});
