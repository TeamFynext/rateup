import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const contact = { findFirst: vi.fn() };
const pipelineStage = { findFirst: vi.fn() };
const lead = { findFirst: vi.fn() };
const leadActivity = { create: vi.fn() };

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    contact,
    lead,
    leadActivity,
    pipelineStage,
    integration: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

const getCachedGetLeadMeta = vi.fn();
const writeGetLeadId = vi.fn();
vi.mock("./getlead.connect.js", () => ({
  getCachedGetLeadMeta: (...args: unknown[]) => getCachedGetLeadMeta(...args),
}));
vi.mock("./getlead.push.js", () => ({
  writeGetLeadId: (...args: unknown[]) => writeGetLeadId(...args),
}));

const moveLead = vi.fn();
const createLead = vi.fn();
vi.mock("../../../pipeline/pipelineLead/lead.service.js", () => ({
  moveLead: (...args: unknown[]) => moveLead(...args),
  createLead: (...args: unknown[]) => createLead(...args),
}));

const createContact = vi.fn();
vi.mock("../../../contact/contact.service.js", () => ({
  createContact: (...args: unknown[]) => createContact(...args),
}));

const { applyGetLeadInbound, unwrapGetLeadDelivery } = await import("./getlead.inbound.js");

const ORG = "org-1";
const STATUS_ID = "01STATUS_QUALIFIED";
const STAGE_ID = "stage-qualified";

const META = {
  sources: [],
  purposes: [],
  custom_fields: [],
  statuses: [
    { id: STATUS_ID, name: "Qualified leads" },
    { id: "01STATUS_NEW", name: "New" },
  ],
};

const BASE_INTEGRATION = {
  id: "int-1",
  orgId: ORG,
  name: "getlead",
  active: true,
  credential: {
    apiKey: "ik_live",
    stageMappings: [
      { stageId: STAGE_ID, stageName: "Qualified", getleadStatusId: STATUS_ID },
      { stageId: "stage-new", stageName: "New", getleadStatusId: "01STATUS_NEW" },
    ],
  },
};

/** Cast once, so a test that spreads it still sees a real object type. */
const INTEGRATION = BASE_INTEGRATION as never;

/** A delivery exactly as GetLead sends one — envelope and all. */
function delivery(data: Record<string, unknown>) {
  return {
    event: "lead.automation",
    data: { event: "lead.status_changed", ...data },
    timestamp: "2026-09-04T07:15:18.933803Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCachedGetLeadMeta.mockResolvedValue(META);
  leadActivity.create.mockResolvedValue({});
  pipelineStage.findFirst.mockResolvedValue({ pipelineId: "p1" });
  moveLead.mockResolvedValue({});
  createLead.mockResolvedValue({ id: "lead-new" });
  createContact.mockResolvedValue({ id: "contact-new" });
  writeGetLeadId.mockResolvedValue(undefined);
});

describe("unwrapGetLeadDelivery", () => {
  test("reads the template out of GetLead's envelope", () => {
    expect(unwrapGetLeadDelivery(delivery({ lead_id: "01L" })).lead_id).toBe("01L");
  });

  test("falls back to the body when there is no envelope", () => {
    expect(unwrapGetLeadDelivery({ lead_id: "01L" }).lead_id).toBe("01L");
  });

  test("survives a body that is not an object", () => {
    expect(unwrapGetLeadDelivery("nonsense")).toEqual({});
    expect(unwrapGetLeadDelivery(null)).toEqual({});
  });
});

describe("applyGetLeadInbound", () => {
  test("moves the lead the status maps to", async () => {
    contact.findFirst.mockResolvedValue({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: "stage-new", contactId: "contact-1", pipelineId: "p1" }],
    });

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(result).toEqual({ applied: true, leadId: "lead-1", stageId: STAGE_ID });
    // `false` is the fourth argument: without it the move is pushed straight
    // back to GetLead, which is where a loop would start.
    expect(moveLead).toHaveBeenCalledWith("lead-1", STAGE_ID, null, false);
  });

  test("matches the status name case-insensitively", async () => {
    contact.findFirst.mockResolvedValue({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: "stage-new", contactId: "contact-1", pipelineId: "p1" }],
    });

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "QUALIFIED LEADS" }),
    );

    expect(result).toMatchObject({ applied: true });
  });

  test("does nothing when the lead is already in that column", async () => {
    contact.findFirst.mockResolvedValue({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: STAGE_ID, contactId: "contact-1", pipelineId: "p1" }],
    });

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    // This is the echo breaker: a status Rateup itself pushed comes back and
    // resolves to the column the lead is already in.
    expect(result).toEqual({ applied: false, reason: "ALREADY_THERE" });
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("skips a status no column maps to", async () => {
    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Converted" }),
    );

    expect(result).toEqual({ applied: false, reason: "UNMAPPED_STATUS" });
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("skips a status GetLead has since renamed", async () => {
    getCachedGetLeadMeta.mockResolvedValue({ ...META, statuses: [{ id: STATUS_ID, name: "Hot" }] });

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(result).toEqual({ applied: false, reason: "UNMAPPED_STATUS" });
  });

  test("falls back to `status` when the template omits `new_status`", async () => {
    contact.findFirst.mockResolvedValue({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: "stage-new", contactId: "contact-1", pipelineId: "p1" }],
    });

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", status: "Qualified leads" }),
    );

    expect(result).toMatchObject({ applied: true });
  });

  test("ignores an event neither path handles", async () => {
    const result = await applyGetLeadInbound(INTEGRATION, ORG, {
      event: "lead.automation",
      data: { event: "lead.deleted", lead_id: "01L" },
    });

    expect(result).toEqual({ applied: false, reason: "UNSUPPORTED_EVENT" });
    expect(moveLead).not.toHaveBeenCalled();
    expect(createLead).not.toHaveBeenCalled();
  });

  test("skips when no status was sent, rather than guessing one", async () => {
    const result = await applyGetLeadInbound(INTEGRATION, ORG, delivery({ lead_id: "01L" }));
    expect(result).toEqual({ applied: false, reason: "NO_STATUS" });
  });

  test("finds a board-only lead by its own stored id", async () => {
    contact.findFirst.mockResolvedValue(null);
    lead.findFirst.mockResolvedValue({
      id: "lead-2",
      stageId: "stage-new",
      contactId: null,
      pipelineId: "p1",
    });

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(result).toMatchObject({ applied: true, leadId: "lead-2" });
  });

  test("falls back to the phone number, stripping the +", async () => {
    contact.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "contact-9",
      leads: [{ id: "lead-9", stageId: "stage-new", contactId: "contact-9", pipelineId: "p1" }],
    });
    lead.findFirst.mockResolvedValue(null);

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", phone: "+919400651372", new_status: "Qualified leads" }),
    );

    expect(result).toMatchObject({ applied: true, leadId: "lead-9" });
    // Rateup stores E.164 without the leading plus.
    expect(contact.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phone: "919400651372" }) }),
    );
  });

  test("skips when no lead matches", async () => {
    contact.findFirst.mockResolvedValue(null);
    lead.findFirst.mockResolvedValue(null);

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(result).toEqual({ applied: false, reason: "LEAD_NOT_FOUND" });
  });

  test("records the move on the lead's timeline", async () => {
    contact.findFirst.mockResolvedValue({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: "stage-new", contactId: "contact-1", pipelineId: "p1" }],
    });

    await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: "lead-1",
          type: "INTEGRATION_RECEIVED",
          details: expect.objectContaining({ statusName: "Qualified leads" }),
        }),
      }),
    );
  });

  test("refuses to move a lead onto a column the org does not own", async () => {
    contact.findFirst.mockResolvedValue({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: "stage-new", contactId: "contact-1", pipelineId: "p1" }],
    });
    // A mapping stored before saveGetLeadSettings validated ownership.
    pipelineStage.findFirst.mockResolvedValue(null);

    const result = await applyGetLeadInbound(
      INTEGRATION,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(result).toEqual({ applied: false, reason: "UNMAPPED_STATUS" });
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("skips an org with no stage mappings without calling GetLead", async () => {
    const bare = { ...BASE_INTEGRATION, credential: { apiKey: "ik" } } as never;

    const result = await applyGetLeadInbound(
      bare,
      ORG,
      delivery({ lead_id: "01L", new_status: "Qualified leads" }),
    );

    expect(result).toEqual({ applied: false, reason: "UNMAPPED_STATUS" });
    expect(getCachedGetLeadMeta).not.toHaveBeenCalled();
  });
});

describe("applyGetLeadInbound: lead.created", () => {
  /** A `lead.created` delivery, matching the template the settings screen hands out. */
  function created(data: Record<string, unknown> = {}) {
    return {
      event: "lead.automation",
      data: {
        event: "lead.created",
        lead_id: "01NEW",
        name: "Asha",
        phone: "+919400651372",
        status: "Qualified leads",
        source: "Facebook",
        ...data,
      },
      timestamp: "2026-09-04T07:15:18.933803Z",
    };
  }

  beforeEach(() => {
    // Nothing on the board yet: no id match, no phone match, no contact.
    contact.findFirst.mockResolvedValue(null);
    lead.findFirst.mockResolvedValue(null);
  });

  test("opens a lead in the column its status maps to", async () => {
    const result = await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(result).toEqual({
      applied: true,
      leadId: "lead-new",
      stageId: STAGE_ID,
      created: true,
    });
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId: "p1",
        stageId: STAGE_ID,
        name: "Asha",
        contactId: "contact-new",
        // Without this the new lead is pushed straight back to GetLead.
        syncIntegrations: false,
      }),
    );
  });

  test("creates the contact with the phone stored the way Rateup stores it", async () => {
    await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(createContact).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG, phone: "919400651372", name: "Asha" }),
    );
  });

  test("reuses a contact already on that number rather than duplicating it", async () => {
    // No lead yet, but the person is already a contact: the id lookup misses,
    // the phone lookup finds a contact with no leads, then findOrCreateContact
    // finds the same row.
    contact.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "contact-7", leads: [] })
      .mockResolvedValueOnce({ id: "contact-7" });

    const result = await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(createContact).not.toHaveBeenCalled();
    expect(result).toMatchObject({ applied: true });
    expect(createLead).toHaveBeenCalledWith(expect.objectContaining({ contactId: "contact-7" }));
  });

  test("remembers the GetLead id, so the status change that follows matches exactly", async () => {
    await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(writeGetLeadId).toHaveBeenCalledWith({ kind: "contact", id: "contact-new" }, "01NEW");
  });

  test("opens a board-only lead when there is no phone number", async () => {
    await applyGetLeadInbound(INTEGRATION, ORG, created({ phone: "" }));

    expect(createContact).not.toHaveBeenCalled();
    expect(createLead).toHaveBeenCalledWith(expect.objectContaining({ contactId: null }));
    // With no contact to hold it, the id goes on the lead itself.
    expect(writeGetLeadId).toHaveBeenCalledWith({ kind: "lead", id: "lead-new" }, "01NEW");
  });

  test("does not create a second lead for one Rateup itself pushed", async () => {
    // The push stored this GetLead id, so the created-workflow echo finds it.
    contact.findFirst.mockResolvedValueOnce({
      id: "contact-1",
      leads: [{ id: "lead-1", stageId: "stage-new", contactId: "contact-1", pipelineId: "p1" }],
    });

    const result = await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(result).toEqual({ applied: false, reason: "ALREADY_EXISTS" });
    expect(createLead).not.toHaveBeenCalled();
    expect(createContact).not.toHaveBeenCalled();
  });

  test("skips a status no column maps to, rather than guessing a pipeline", async () => {
    const result = await applyGetLeadInbound(INTEGRATION, ORG, created({ status: "Converted" }));

    expect(result).toEqual({ applied: false, reason: "UNMAPPED_STATUS" });
    expect(createLead).not.toHaveBeenCalled();
  });

  test("skips when the delivery carries no status", async () => {
    const result = await applyGetLeadInbound(INTEGRATION, ORG, created({ status: "" }));
    expect(result).toEqual({ applied: false, reason: "NO_STATUS" });
  });

  test("falls back to the phone number when the lead has no name", async () => {
    await applyGetLeadInbound(INTEGRATION, ORG, created({ name: "  " }));

    // `Lead.name` will not take an empty string.
    expect(createLead).toHaveBeenCalledWith(expect.objectContaining({ name: "919400651372" }));
  });

  test("skips a lead with neither a name nor a number", async () => {
    const result = await applyGetLeadInbound(INTEGRATION, ORG, created({ name: "", phone: "" }));

    expect(result).toEqual({ applied: false, reason: "NO_NAME" });
    expect(createLead).not.toHaveBeenCalled();
  });

  test("refuses to open a lead on a column the org does not own", async () => {
    pipelineStage.findFirst.mockResolvedValue(null);

    const result = await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(result).toEqual({ applied: false, reason: "UNMAPPED_STATUS" });
    expect(createLead).not.toHaveBeenCalled();
  });

  test("records the creation on the lead timeline with GetLead's own source", async () => {
    await applyGetLeadInbound(INTEGRATION, ORG, created());

    expect(leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: "lead-new",
          type: "INTEGRATION_RECEIVED",
          details: expect.objectContaining({
            inboundCreated: true,
            sourceLabel: "Facebook",
            externalId: "01NEW",
          }),
        }),
      }),
    );
  });
});
