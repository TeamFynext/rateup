import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    pipeline: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pipelineTeam: { findFirst: vi.fn(), findMany: vi.fn() },
    pipelineStage: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pipelineLostReason: { findUnique: vi.fn() },
    leadAssignee: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    user: { findMany: vi.fn() },
    lifecycle: { findMany: vi.fn() },
    lead: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    leadActivity: { create: vi.fn(), createMany: vi.fn() },
    leadNote: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    leadTask: { updateMany: vi.fn() },
    contact: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    teamMember: { findMany: vi.fn() },
    team: { findMany: vi.fn(), updateMany: vi.fn() },
    integration: { findMany: vi.fn() },
    webhook: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

// The lead service only emits integration events now. Each one is run through
// the real fan-out and adapters inline, so the assertions below still check the
// Bigin, GetLead and Zapier jobs that come out the other end — the same ones the
// service used to enqueue itself. The org is treated as having Zoho and GetLead
// connected.
vi.mock("../integrations/events/emitIntegrationEvent.js", async () => {
  const { processIntegrationEvent } =
    await import("../integrations/events/integrationEvent.fanout.js");
  return {
    INTEGRATION_EVENT_JOB: "integration-event",
    emitIntegrationEvent: vi.fn((orgId: string, event: any) =>
      processIntegrationEvent({ orgId, event }),
    ),
  };
});

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

// The stage sync fans out to BullMQ, which would otherwise try to reach Redis
// from a unit test. Mocked so the enqueue can be asserted instead.
vi.mock("../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
  notificationQueue: { add: vi.fn() },
}));
// Pulled in by a dynamic import inside `moveLead` to run the Stage Updated
// rules. Left real it drags the whole automated-reply module tree in mid-test,
// which is slow enough under a parallel run to trip the 5s timeout.
vi.mock("../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
  resolveContactChannel: vi.fn().mockResolvedValue({ platform: "whatsapp" }),
}));
vi.mock("../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: { CONTACT_STAGE_UPDATED: "contact_stage_updated" },
}));
vi.mock("../integrations/external/zoho/zoho.service.js", () => ({
  pushCrmLeadStatus: vi.fn(),
  ZohoTriggers: {
    CONTACT_CREATE: "contact_created",
    CONTACT_UPDATE: "contact_updated",
    CONTACT_DELETE: "contact_deleted",
    LEAD_CREATE: "lead_created",
    LEAD_UPDATE: "lead_updated",
    BIGIN_CONTACT_CREATE: "bigin_contact_created",
    BIGIN_CONTACT_UPDATE: "bigin_contact_updated",
    BIGIN_CONTACT_DELETE: "bigin_contact_deleted",
    BIGIN_DEAL_CREATE: "bigin_deal_created",
  },
}));
vi.mock("../integrations/meta/conversions.service.js", () => ({
  sendWonConversionEvent: vi.fn(),
}));

import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { integrationTriggerQueue } from "../../workers/bullmq/queues/index.js";
import { addZapierTriggerToQueue } from "../integrations/external/zapier/zapier.service.js";
import { pushCrmLeadStatus } from "../integrations/external/zoho/zoho.service.js";
import { sendWonConversionEvent } from "../integrations/meta/conversions.service.js";
import {
  isPipelineAccessible,
  TeamAccessError,
  createPipeline,
  LeadsPipelineExistsError,
  PipelineLimitError,
  updatePipeline,
} from "./pipeline.service.js";
import { OTHER_PIPELINE_LIMIT, PIPELINE_TYPE_SEEDS } from "./pipelineTypes.js";
import {
  verifyOwnerForDelete,
  verifyOwnerForTeamChange,
  verifyPipelineAccess,
} from "./pipeline.auth.js";
import { deleteStage, StageNotEmptyError } from "./pipelineStage/stage.service.js";
import {
  clearContactStage,
  closeLead,
  listLeads,
  BadCursorError,
  countContactStageLoss,
  createLead,
  getLeadById,
  moveLead,
  NotNoteAuthorError,
  updateNote,
  openLeadOnPipelineForContact,
  resolvePipelineForContact,
  setContactStage,
  bulkSetContactStage,
  updateLead,
} from "./pipelineLead/lead.service.js";
import { createLeadRequestSchema } from "./pipelineLead/lead.schema.js";
import { createStageRequestSchema } from "./pipelineStage/stage.schema.js";

const db = prisma as unknown as Record<string, any>;

const USER = "11111111-1111-1111-1111-111111111111";

/**
 * The org's connected integrations: Zoho and GetLead, every trigger switched on,
 * so the providers' subscription filter lets every event through.
 */
const subscribed = (...fields: string[]) => ({
  triggerSubscriptions: fields.map((subscribed_field) => ({ subscribed_field, active: true })),
});
const CONNECTED_INTEGRATIONS = [
  {
    name: "zoho",
    active: true,
    credential: subscribed(
      "contact_created",
      "contact_updated",
      "contact_deleted",
      "lead_created",
      "lead_updated",
      "bigin_contact_created",
      "bigin_contact_updated",
      "bigin_contact_deleted",
      "bigin_deal_created",
    ),
  },
  {
    name: "getlead",
    active: true,
    credential: subscribed("getlead_lead_create", "getlead_lead_update"),
  },
];
/** A team-scoped actor reaching exactly these teams. */
const scoped = (teamIds: string[]) =>
  ({ orgId: ORG, userId: USER, scope: { all: false, teamIds, inbox: "all" } }) as any;
const ORG = "22222222-2222-4222-8222-222222222222";
const PIPELINE = "33333333-3333-4333-8333-333333333333";
const STAGE = "44444444-4444-4444-8444-444444444444";
const NEXT_STAGE = "55555555-5555-4555-8555-555555555555";
const LEAD = "66666666-6666-4666-8666-666666666666";
const CONTACT = "77777777-7777-4777-8777-777777777777";
const REASON = "99999999-9999-4999-8999-999999999999";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

/** Runs the callback against the same mocked client, as a real transaction would. */
function runTransaction() {
  db.$transaction.mockImplementation((argument: any) =>
    typeof argument === "function" ? argument(db) : Promise.all(argument),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  runTransaction();
  // `moveLead` resolves its target column through `findFirstOrThrow`, scoped to
  // the lead's own board; `createLead` still uses `findUniqueOrThrow`. Aliased
  // so a test only has to stub the column once, whichever path it exercises.
  // The scoping itself is asserted directly in "refuses a column from another
  // board", which reads the `where` clause.
  db.pipelineStage.findFirstOrThrow.mockImplementation((...args: unknown[]) =>
    db.pipelineStage.findUniqueOrThrow(...args),
  );
  db.leadActivity.createMany.mockResolvedValue({ count: 1 });
  db.leadActivity.create.mockResolvedValue({ id: "activity" });
  db.leadTask.updateMany.mockResolvedValue({ count: 0 });
  db.contact.update.mockResolvedValue({ id: CONTACT });
  db.lifecycle.findMany.mockResolvedValue([]);
  db.leadAssignee.findMany.mockResolvedValue([]);
  // No team opts into auto-create unless a test says so.
  db.team.findMany.mockResolvedValue([]);
  // The org has no board yet, so the per-org limit is not in the way.
  db.pipeline.count.mockResolvedValue(0);
  db.leadAssignee.createMany.mockResolvedValue({ count: 0 });
  db.leadAssignee.deleteMany.mockResolvedValue({ count: 0 });
  db.user.findMany.mockResolvedValue([]);
  db.integration.findMany.mockResolvedValue(CONNECTED_INTEGRATIONS);
  db.webhook.findUnique.mockResolvedValue(null);
});

describe("pipeline access", () => {
  test("a member of one of the pipeline's teams has access", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue({ pipelineId: PIPELINE });
    await expect(isPipelineAccessible(PIPELINE, scoped(["own-team"]))).resolves.toBe(true);
  });

  test("someone on none of its teams does not", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue(null);
    await expect(isPipelineAccessible(PIPELINE, scoped(["own-team"]))).resolves.toBe(false);
  });

  test("the guard answers 403 rather than letting the handler run", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue(null);
    const rep = reply();

    await verifyPipelineAccess(
      { params: { id: PIPELINE }, userId: USER, actor: scoped(["own-team"]) } as any,
      rep,
    );

    expect(answer(rep).code).toBe(403);
  });
});

// Board tuning is for whoever works the board; handing it to another team or
// deleting it is not. The UI hides both, and these keep the routes honest.
describe("owner-only pipeline actions", () => {
  const member = (body: unknown) => ({
    params: { id: PIPELINE },
    body,
    user: { role: "MEMBER" },
    actor: { can: () => false },
  });
  const owner = (body: unknown) => ({
    params: { id: PIPELINE },
    body,
    user: { role: "SUPER_ADMIN" },
    actor: { can: (p: string) => p === "pipelines.admin" },
  });

  test("a member may still retune the funnel", async () => {
    const rep = reply();
    await verifyOwnerForTeamChange(member({ rottingEnabled: false }) as any, rep);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("a member may not change the teams", async () => {
    const rep = reply();
    await verifyOwnerForTeamChange(member({ teamIds: ["t1"] }) as any, rep);
    expect(answer(rep).code).toBe(403);
  });

  test("an owner may change the teams", async () => {
    const rep = reply();
    await verifyOwnerForTeamChange(owner({ teamIds: ["t1"] }) as any, rep);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("only an owner may delete the board", async () => {
    const memberReply = reply();
    await verifyOwnerForDelete(member(undefined) as any, memberReply);
    expect(answer(memberReply).code).toBe(403);

    const ownerReply = reply();
    await verifyOwnerForDelete(owner(undefined) as any, ownerReply);
    expect(ownerReply.code).not.toHaveBeenCalled();
  });
});

describe("creating a pipeline", () => {
  test("refuses teams the caller does not belong to", async () => {
    const actor = scoped(["own-team"]);

    await expect(
      createPipeline({
        name: "WhatsApp Sales",
        teamIds: ["own-team", "someone-elses-team"],
        orgId: ORG,
        userId: USER,
        actor,
      }),
    ).rejects.toBeInstanceOf(TeamAccessError);
    expect(db.pipeline.create).not.toHaveBeenCalled();
  });

  // The board is the org's own, so it starts from the template rather than from
  // anything the inbox happens to hold.
  test("seeds the default funnel, in order, ending in Won and Lost", async () => {
    const actor = scoped(["own-team"]);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });

    await createPipeline({
      name: "WhatsApp Sales",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
      actor,
    });

    const data = db.pipeline.create.mock.calls[0][0].data;
    expect(data.stages.create).toHaveLength(PIPELINE_TYPE_SEEDS.LEADS.stages.length);
    expect(data.stages.create.map((stage: { name: string }) => stage.name)).toEqual(
      PIPELINE_TYPE_SEEDS.LEADS.stages.map((stage) => stage.name),
    );
    // Order is positional, so a reordered template cannot silently scramble a board.
    expect(data.stages.create.map((stage: { order: number }) => stage.order)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(data.stages.create.map((stage: { status: string }) => stage.status)).toEqual([
      "OPEN",
      "OPEN",
      "OPEN",
      "OPEN",
      "OPEN",
      "WON",
      "LOST",
    ]);
    expect(data.lostReasons.create.length).toBeGreaterThan(0);
  });

  // The board no longer reads the org's lifecycles at all.
  test("does not look at the org's lifecycles", async () => {
    const actor = scoped(["own-team"]);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });

    await createPipeline({
      name: "WhatsApp Sales",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
      actor,
    });

    expect(db.lifecycle.findMany).not.toHaveBeenCalled();
  });

  // One Leads board per org. The count is per-org, so another org having one must not
  // block this one.
  test("refuses a second Leads pipeline in the same org", async () => {
    const actor = scoped(["own-team"]);
    db.pipeline.count.mockResolvedValue(1);

    await expect(
      createPipeline({
        name: "Second board",
        teamIds: ["own-team"],
        orgId: ORG,
        userId: USER,
        actor,
      }),
    ).rejects.toBeInstanceOf(LeadsPipelineExistsError);

    expect(db.pipeline.count.mock.calls[0][0]).toMatchObject({
      where: { orgId: ORG, type: "LEADS" },
    });
    expect(db.pipeline.create).not.toHaveBeenCalled();
  });

  test("the unique index answers a Leads create that raced past the count", async () => {
    const actor = scoped(["own-team"]);
    db.pipeline.count.mockResolvedValue(0);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7",
        meta: { target: "pipeline_one_leads_per_org" },
      }),
    );

    await expect(
      createPipeline({ name: "Sales", teamIds: ["own-team"], orgId: ORG, userId: USER, actor }),
    ).rejects.toBeInstanceOf(LeadsPipelineExistsError);
  });

  test("an org with a Leads board can still add a Support board", async () => {
    const actor = scoped(["own-team"]);
    db.pipeline.count.mockResolvedValue(0);
    db.pipeline.findFirst.mockResolvedValue({ order: 0 });
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });

    await createPipeline({
      name: "Repairs",
      type: "SUPPORT",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
      actor,
    });

    expect(db.pipeline.count.mock.calls[0][0]).toMatchObject({
      where: { orgId: ORG, type: { not: "LEADS" } },
    });
    const data = db.pipeline.create.mock.calls[0][0].data;
    expect(data.type).toBe("SUPPORT");
    expect(data.order).toBe(1);
    expect(data.stages.create.map((stage: { name: string }) => stage.name)).toEqual(
      PIPELINE_TYPE_SEEDS.SUPPORT.stages.map((stage) => stage.name),
    );
    expect(data.lostReasons.create).toEqual([]);
  });

  test("caps the boards besides Leads", async () => {
    const actor = scoped(["own-team"]);
    db.pipeline.count.mockResolvedValue(OTHER_PIPELINE_LIMIT);

    await expect(
      createPipeline({
        name: "Eleventh",
        type: "PROJECTS",
        teamIds: ["own-team"],
        orgId: ORG,
        userId: USER,
        actor,
      }),
    ).rejects.toBeInstanceOf(PipelineLimitError);
    expect(db.pipeline.create).not.toHaveBeenCalled();
  });
});

describe("changing a pipeline's teams", () => {
  beforeEach(() => {
    db.pipeline.update.mockResolvedValue({ id: PIPELINE });
    db.team.updateMany.mockResolvedValue({ count: 0 });
  });

  test("refuses to add a team the caller does not belong to", async () => {
    db.pipelineTeam.findMany.mockResolvedValue([{ teamId: "own-team" }]);
    const actor = scoped(["own-team"]);

    await expect(
      updatePipeline(PIPELINE, { teamIds: ["own-team", "someone-elses-team"] }, actor),
    ).rejects.toBeInstanceOf(TeamAccessError);
    expect(db.pipeline.update).not.toHaveBeenCalled();
  });

  // Otherwise a board shared with a team you are not on would reject every edit,
  // including ones that leave that team exactly where it is.
  test("lets a team already on the board be kept", async () => {
    db.pipelineTeam.findMany.mockResolvedValue([{ teamId: "own-team" }, { teamId: "their-team" }]);
    const actor = scoped(["own-team"]);

    await updatePipeline(PIPELINE, { teamIds: ["own-team", "their-team"] }, actor);

    expect(db.pipeline.update.mock.calls[0][0].data.teams.createMany.data).toEqual([
      { teamId: "own-team" },
      { teamId: "their-team" },
    ]);
  });

  test("a team taken off the board stops filing contacts onto it", async () => {
    db.pipelineTeam.findMany.mockResolvedValue([{ teamId: "own-team" }, { teamId: "dropped" }]);
    const actor = scoped(["own-team", "dropped"]);

    await updatePipeline(PIPELINE, { teamIds: ["own-team"] }, actor);

    expect(db.team.updateMany).toHaveBeenCalledWith({
      where: { defaultPipelineId: PIPELINE, id: { notIn: ["own-team"] } },
      data: { defaultPipelineId: null, autoCreateLeads: false },
    });
  });

  test("an edit that does not touch teams leaves the routing alone", async () => {
    await updatePipeline(PIPELINE, { rottingEnabled: false }, scoped(["own-team"]));

    expect(db.pipelineTeam.findMany).not.toHaveBeenCalled();
    expect(db.team.updateMany).not.toHaveBeenCalled();
  });
});

describe("deleting a stage", () => {
  test("refuses to strand the leads it holds", async () => {
    db.lead.count.mockResolvedValue(3);

    await expect(deleteStage(STAGE)).rejects.toBeInstanceOf(StageNotEmptyError);
    expect(db.pipelineStage.delete).not.toHaveBeenCalled();
  });

  test("moves the leads on before deleting when given somewhere to put them", async () => {
    db.lead.count.mockResolvedValue(3);
    db.lead.updateMany.mockResolvedValue({ count: 3 });
    db.pipelineStage.delete.mockResolvedValue({ id: STAGE });

    await deleteStage(STAGE, NEXT_STAGE);

    expect(db.lead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stageId: NEXT_STAGE }) }),
    );
    expect(db.pipelineStage.delete).toHaveBeenCalledWith({ where: { id: STAGE } });
  });

  test("an empty stage needs no destination", async () => {
    db.lead.count.mockResolvedValue(0);
    db.pipelineStage.delete.mockResolvedValue({ id: STAGE });

    await deleteStage(STAGE);

    expect(db.lead.updateMany).not.toHaveBeenCalled();
    expect(db.pipelineStage.delete).toHaveBeenCalled();
  });
});

describe("moving a lead", () => {
  function movingInto(overrides: { status?: "OPEN" | "WON" | "LOST" } = {}) {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: STAGE,
      stage: { name: "Contacted" },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({
      name: "Qualified",
      status: overrides.status ?? "OPEN",
    });
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId: NEXT_STAGE,
      labels: [],
      assignees: [],
      tasks: [],
    });
  }

  test("looks the target column up on the lead's own board", async () => {
    movingInto();

    await moveLead(LEAD, NEXT_STAGE, USER);

    // Not `findUnique({ id })`. The stage id comes from a client, an automation
    // rule or a CRM webhook, and `verifyLeadAccess` only proves the caller may
    // touch the lead — nothing upstream checks the column belongs to the same
    // board. Unscoped, this was a cross-tenant write: the integration fan-out
    // derives the org from the *stage's* pipeline, so a lead parked on another
    // org's column pushes its name, email and phone to that org's CRM.
    expect(db.pipelineStage.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NEXT_STAGE, pipeline: { leads: { some: { id: LEAD } } } },
      }),
    );
  });

  test("refuses a column from another board", async () => {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: STAGE,
      stage: { name: "Contacted" },
    });
    // What Prisma raises when the scoped lookup matches nothing.
    const notFound = Object.assign(new Error("No PipelineStage found"), { code: "P2025" });
    db.pipelineStage.findFirstOrThrow.mockRejectedValue(notFound);

    await expect(moveLead(LEAD, "someone-elses-stage", USER)).rejects.toMatchObject({
      code: "P2025",
    });
    expect(db.lead.update).not.toHaveBeenCalled();
  });

  test("restamps the stage clock and records the move", async () => {
    movingInto();

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.stageId).toBe(NEXT_STAGE);
    expect(update.stageEnteredAt).toBeInstanceOf(Date);
    expect(db.leadActivity.create.mock.calls[0][0].data).toMatchObject({
      type: "MOVED",
      details: { fromStageName: "Contacted", toStageName: "Qualified" },
    });
  });

  // Moving a lead is now purely a board action; the contact's own lifecycle is
  // its own record and is left alone.
  test("does not touch the contact", async () => {
    movingInto();

    await moveLead(LEAD, NEXT_STAGE, USER);

    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("landing on a won column closes the lead won", async () => {
    movingInto({ status: "WON" });

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("WON");
    expect(update.closedAt).toBeInstanceOf(Date);
    expect(update.closedById).toBe(USER);
    expect(db.leadActivity.create.mock.calls[0][0].data.type).toBe("WON");
  });

  test("landing on a lost column closes the lead lost and keeps the reason", async () => {
    movingInto({ status: "LOST" });

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("LOST");
    expect(update.closedAt).toBeInstanceOf(Date);
    // The reason belongs to a lead sitting in a Lost column, so a move within
    // that column must not wipe it.
    expect(update).not.toHaveProperty("lostReasonId");
    expect(db.leadActivity.create.mock.calls[0][0].data.type).toBe("LOST");
  });

  test("moving back to an open column reopens it and clears the close", async () => {
    movingInto({ status: "OPEN" });

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("OPEN");
    expect(update.closedAt).toBeNull();
    expect(update.closedById).toBeNull();
    expect(update.lostReasonId).toBeNull();
  });
});

describe("closing a lead", () => {
  beforeEach(() => {
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId: NEXT_STAGE,
      labels: [],
      assignees: [],
      tasks: [],
    });
  });

  test("a win moves the lead onto the won column", async () => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: NEXT_STAGE });

    await closeLead(LEAD, { status: "WON" }, USER);

    expect(db.lead.update.mock.calls[0][0].data).toMatchObject({
      status: "WON",
      stageId: NEXT_STAGE,
      lostReasonId: null,
    });
  });

  // Lost is a column now, so a loss lands in it rather than leaving the lead
  // sitting in whatever open column it stalled in.
  test("a loss moves the lead onto the lost column and records the reason", async () => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: NEXT_STAGE });
    db.pipelineLostReason.findUnique.mockResolvedValue({ label: "Price too high" });

    await closeLead(
      LEAD,
      { status: "LOST", lostReasonId: REASON, note: "Went with a rival" },
      USER,
    );

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("LOST");
    expect(update.lostReasonId).toBe(REASON);
    expect(update.stageId).toBe(NEXT_STAGE);
    expect(db.leadActivity.create.mock.calls[0][0].data.details).toMatchObject({
      lostReasonLabel: "Price too high",
      note: "Went with a rival",
    });
  });

  // A drag names the exact column it landed on; only a button press has to fall
  // back to "the first column of that status".
  test("closes onto the column that was dropped on when one is named", async () => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });

    await closeLead(LEAD, { status: "LOST", stageId: STAGE }, USER);

    expect(db.pipelineStage.findFirst.mock.calls[0][0].where).toMatchObject({ id: STAGE });
    expect(db.lead.update.mock.calls[0][0].data.stageId).toBe(STAGE);
  });

  // A board with no column of that status still records the close on the lead.
  test("leaves the lead where it is when the board has no such column", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(null);

    await closeLead(LEAD, { status: "WON" }, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("WON");
    expect(update.stageId).toBeUndefined();
  });

  test("closing clears the lead's open tasks", async () => {
    db.pipelineLostReason.findUnique.mockResolvedValue(null);

    await closeLead(LEAD, { status: "LOST" }, USER);

    expect(db.leadTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { leadId: LEAD, completedAt: null } }),
    );
  });
});

describe("a lead's owner", () => {
  beforeEach(() => {
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ status: "OPEN" });
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
  });

  test("a new lead gets a share-link id shaped like a web survey's", async () => {
    await createLead({
      pipelineId: PIPELINE,
      stageId: STAGE,
      name: "Walk-in",
      source: "MANUAL",
      channel: "NONE",
      userId: USER,
    } as never);

    expect(db.lead.create.mock.calls[0][0].data.shortUrlId).toMatch(
      /^[6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz]{8}$/,
    );
  });

  test("is whoever opened it", async () => {
    await createLead({
      pipelineId: PIPELINE,
      stageId: STAGE,
      name: "Walk-in",
      source: "MANUAL",
      channel: "NONE",
      userId: USER,
    } as never);

    expect(db.lead.create.mock.calls[0][0].data.ownerId).toBe(USER);
  });

  test("is nobody when a rule opened it, even on someone's action", async () => {
    await createLead({
      pipelineId: PIPELINE,
      stageId: STAGE,
      name: "Walk-in",
      source: "MANUAL",
      channel: "NONE",
      userId: USER,
      automated: true,
    } as never);

    expect(db.lead.create.mock.calls[0][0].data.ownerId).toBeNull();

    const created = db.leadActivity.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ type: "CREATED", userId: USER });
    expect(created.details.automated).toBe(true);
  });

  // One card per contact per board is a constraint the user can hit by hand —
  // adding a lead for someone the board already holds. It has to come back as a
  // refusal that names the card in the way, not as a 500 from the unique index.
  test("is refused when that contact already has a lead on the board", async () => {
    db.lead.findUnique.mockResolvedValue({
      id: "lead-existing",
      name: "Ritu Bansal",
      stageId: "stage-qualified",
      stage: { name: "Qualified" },
    });

    await expect(
      createLead({
        pipelineId: PIPELINE,
        stageId: STAGE,
        name: "Ritu",
        contactId: CONTACT,
        source: "MANUAL",
        channel: "NONE",
        userId: USER,
      } as never),
    ).rejects.toMatchObject({
      name: "LeadExistsForContactError",
      leadId: "lead-existing",
      message: "Ritu Bansal is already on this board, in Qualified.",
    });

    // Refused before the insert, so nothing was written.
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  test("a hand-added lead is not marked automated", async () => {
    await createLead({
      pipelineId: PIPELINE,
      stageId: STAGE,
      name: "Walk-in",
      source: "MANUAL",
      channel: "NONE",
      userId: USER,
    } as never);

    const created = db.leadActivity.create.mock.calls[0][0].data;
    expect(created.details.automated).toBeUndefined();
  });
});

describe("a rule opening a lead on a named pipeline", () => {
  beforeEach(() => {
    db.lead.findUnique.mockResolvedValue(null);
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ status: "OPEN" });
    db.contact.findUnique.mockResolvedValue({ name: "Aditi", phone: "+91", email: null });
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
  });

  function open() {
    return openLeadOnPipelineForContact({
      contactId: CONTACT,
      pipelineId: PIPELINE,
      source: "WHATSAPP",
      channel: "WHATSAPP",
    });
  }

  test("lands in the board's first open column", async () => {
    await open();

    expect(db.pipelineStage.findFirst).toHaveBeenCalledWith({
      where: { pipelineId: PIPELINE, status: "OPEN" },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    expect(db.lead.create.mock.calls[0][0].data).toMatchObject({
      pipelineId: PIPELINE,
      stageId: STAGE,
      contactId: CONTACT,
      source: "WHATSAPP",
      ownerId: null,
    });
  });

  // A closed lead means someone decided; a second card would quietly undo it.
  test("leaves a contact already on the board alone", async () => {
    db.lead.findUnique.mockResolvedValue({ id: "existing" });

    expect(await open()).toBeNull();
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  // A board of nothing but closing columns has nowhere to open a lead.
  test("does nothing when the board has no open column", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(null);

    expect(await open()).toBeNull();
    expect(db.lead.create).not.toHaveBeenCalled();
  });
});

// A rule names the board it wants, so it must not also fan the contact out across
// every team that happens to have auto-add on.
describe("editing a note", () => {
  test("its author may change the text", async () => {
    db.leadNote.findUniqueOrThrow.mockResolvedValueOnce({ authorId: USER });

    await updateNote("note-1", { text: "Called back, wants a quote" }, USER);

    expect(db.leadNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "note-1" },
        data: { text: "Called back, wants a quote" },
      }),
    );
  });

  test("anyone else is refused, admins included", async () => {
    db.leadNote.findUniqueOrThrow.mockResolvedValueOnce({ authorId: "someone-else" });

    await expect(updateNote("note-1", { text: "x" }, USER)).rejects.toBeInstanceOf(
      NotNoteAuthorError,
    );
    expect(db.leadNote.update).not.toHaveBeenCalled();
  });
});

describe("a lead's detail", () => {
  test("lists every open activity, with the soonest as the next one", async () => {
    const soon = { id: "t1", title: "Call", dueAt: new Date("2026-10-01") };
    const later = { id: "t2", title: "Send quote", dueAt: new Date("2026-10-05") };
    db.lead.findUnique.mockResolvedValueOnce({
      id: LEAD,
      labels: [],
      assignees: [],
      tasks: [soon, later],
      notes: [],
      activities: [],
    });

    const lead = await getLeadById(LEAD);

    expect(db.lead.findUnique.mock.calls[0][0].include.tasks).toMatchObject({
      where: { completedAt: null },
      take: undefined,
    });
    expect(lead?.openTasks).toEqual([soon, later]);
    expect(lead?.nextTask).toEqual(soon);
  });
});

describe("assigning a lead", () => {
  const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  function leadAfterUpdate() {
    db.lead.update.mockResolvedValue({
      id: LEAD,
      labels: [],
      assignees: [],
      tasks: [],
    });
  }

  test("adds the people who are new and removes the ones who are gone", async () => {
    leadAfterUpdate();
    db.leadAssignee.findMany.mockResolvedValue([
      { assigneeId: ALICE, assignee: { id: ALICE, name: "Alice" } },
    ]);
    db.user.findMany.mockResolvedValue([{ name: "Bob" }]);

    await updateLead(LEAD, { assigneeIds: [BOB] } as never, USER);

    expect(db.leadAssignee.deleteMany).toHaveBeenCalledWith({
      where: { leadId: LEAD, assigneeId: { in: [ALICE] } },
    });
    expect(db.leadAssignee.createMany).toHaveBeenCalledWith({
      data: [{ leadId: LEAD, assigneeId: BOB }],
      skipDuplicates: true,
    });
  });

  // The timeline entry names the difference, not the whole roster, so an edit
  // reads as "added Bob" rather than restating everyone every time.
  test("records only who joined and who left", async () => {
    leadAfterUpdate();
    db.leadAssignee.findMany.mockResolvedValue([
      { assigneeId: ALICE, assignee: { id: ALICE, name: "Alice" } },
    ]);
    db.user.findMany.mockResolvedValue([{ name: "Bob" }]);

    await updateLead(LEAD, { assigneeIds: [ALICE, BOB] } as never, USER);

    expect(db.leadActivity.create.mock.calls[0][0].data).toMatchObject({
      type: "ASSIGNEES_CHANGED",
      details: { addedNames: ["Bob"], removedNames: [] },
    });
    expect(db.leadAssignee.deleteMany).not.toHaveBeenCalled();
  });

  test("an unchanged set writes nothing to the timeline", async () => {
    leadAfterUpdate();
    db.leadAssignee.findMany.mockResolvedValue([
      { assigneeId: ALICE, assignee: { id: ALICE, name: "Alice" } },
    ]);

    await updateLead(LEAD, { assigneeIds: [ALICE] } as never, USER);

    expect(db.leadActivity.create).not.toHaveBeenCalled();
    expect(db.leadAssignee.createMany).not.toHaveBeenCalled();
    expect(db.leadAssignee.deleteMany).not.toHaveBeenCalled();
  });

  test("clearing the list unassigns everyone", async () => {
    leadAfterUpdate();
    db.leadAssignee.findMany.mockResolvedValue([
      { assigneeId: ALICE, assignee: { id: ALICE, name: "Alice" } },
      { assigneeId: BOB, assignee: { id: BOB, name: "Bob" } },
    ]);

    await updateLead(LEAD, { assigneeIds: [] } as never, USER);

    expect(db.leadAssignee.deleteMany).toHaveBeenCalledWith({
      where: { leadId: LEAD, assigneeId: { in: [ALICE, BOB] } },
    });
    expect(db.leadActivity.create.mock.calls[0][0].data.details).toEqual({
      addedNames: [],
      removedNames: ["Alice", "Bob"],
    });
  });

  // An edit that never mentions assignees must not silently unassign the lead.
  test("leaving assigneeIds out touches nobody", async () => {
    leadAfterUpdate();

    await updateLead(LEAD, { name: "Renamed" } as never, USER);

    expect(db.leadAssignee.findMany).not.toHaveBeenCalled();
    expect(db.leadActivity.create).not.toHaveBeenCalled();
  });
});

// The request schemas are the API's outer edge, so the guarantees the services
// rely on downstream are asserted here rather than inferred.
describe("the stage request schema", () => {
  const base = { pipelineId: PIPELINE, name: "Qualified" };

  test("defaults a new stage to open", () => {
    const parsed = createStageRequestSchema.parse(base);
    // Left undefined rather than defaulted in zod, so the service's own
    // `?? "OPEN"` is the single place the default lives.
    expect(parsed.status).toBeUndefined();
  });

  test("accepts each of the three statuses and nothing else", () => {
    for (const status of ["OPEN", "WON", "LOST"]) {
      expect(createStageRequestSchema.safeParse({ ...base, status }).success).toBe(true);
    }
    expect(createStageRequestSchema.safeParse({ ...base, status: "won" }).success).toBe(false);
    expect(createStageRequestSchema.safeParse({ ...base, status: "ARCHIVED" }).success).toBe(false);
  });

  test("rejects a colour that is not #rrggbb", () => {
    expect(createStageRequestSchema.safeParse({ ...base, color: "#16A34A" }).success).toBe(true);
    expect(createStageRequestSchema.safeParse({ ...base, color: "red" }).success).toBe(false);
    expect(createStageRequestSchema.safeParse({ ...base, color: "#16A34" }).success).toBe(false);
  });

  test("keeps probability inside 0-100 and rotting inside a year", () => {
    expect(createStageRequestSchema.safeParse({ ...base, probability: 101 }).success).toBe(false);
    expect(createStageRequestSchema.safeParse({ ...base, probability: -1 }).success).toBe(false);
    expect(createStageRequestSchema.safeParse({ ...base, rottingDays: 366 }).success).toBe(false);
    expect(createStageRequestSchema.safeParse({ ...base, rottingDays: 0 }).success).toBe(true);
  });

  test("an unnamed stage is refused", () => {
    expect(createStageRequestSchema.safeParse({ pipelineId: PIPELINE, name: "" }).success).toBe(
      false,
    );
  });
});

describe("the lead request schema", () => {
  const base = { pipelineId: PIPELINE, stageId: STAGE, name: "Meera Joshi" };

  test("a lead with no stated origin is a manual one on no channel", () => {
    const parsed = createLeadRequestSchema.parse(base);
    expect(parsed.source).toBe("MANUAL");
    expect(parsed.channel).toBe("NONE");
  });

  test("needs a board and a column to land on", () => {
    expect(createLeadRequestSchema.safeParse({ ...base, pipelineId: undefined }).success).toBe(
      false,
    );
    expect(createLeadRequestSchema.safeParse({ ...base, stageId: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  test("an unnamed lead is refused, an unreachable one is not", () => {
    expect(createLeadRequestSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    // Phone and email are both optional: a lead can start as just a name.
    expect(createLeadRequestSchema.safeParse({ ...base, phone: null, email: null }).success).toBe(
      true,
    );
    expect(createLeadRequestSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });
});

describe("assigning a contact to a stage", () => {
  beforeEach(() => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Qualified", status: "OPEN" });
    db.contact.findUnique.mockResolvedValue({ name: "Aditi", phone: "+91", email: null });
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
    db.lead.update.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: "old-stage",
      stage: { name: "New Lead" },
    });
  });

  function assign() {
    return setContactStage({
      contactId: CONTACT,
      pipelineId: PIPELINE,
      stageId: STAGE,
      source: "WHATSAPP",
      channel: "WHATSAPP",
    });
  }

  test("opens a lead on that column when the contact has none", async () => {
    db.lead.findUnique.mockResolvedValue(null);

    await assign();

    expect(db.lead.create.mock.calls[0][0].data).toMatchObject({
      pipelineId: PIPELINE,
      stageId: STAGE,
      contactId: CONTACT,
    });
  });

  test("moves the lead when the contact is already on the board", async () => {
    db.lead.findUnique.mockResolvedValue({ id: LEAD, stageId: "old-stage" });

    await assign();

    expect(db.lead.create).not.toHaveBeenCalled();
    expect(db.lead.update.mock.calls[0][0].data).toMatchObject({ stageId: STAGE });
  });

  // Integrations re-assert the same stage on every sync; a timeline full of
  // moves that never happened would make the real ones unreadable.
  test("is a no-op when the lead already sits in that column", async () => {
    db.lead.findUnique.mockResolvedValue({ id: LEAD, stageId: STAGE });

    expect(await assign()).toBeNull();
    expect(db.lead.update).not.toHaveBeenCalled();
    expect(db.leadActivity.create).not.toHaveBeenCalled();
  });

  // A rule naming a column that was deleted, or one on another org's board,
  // should quietly do nothing rather than fail the message it was answering.
  test("does nothing when the stage is not on that board", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(null);

    expect(await assign()).toBeNull();
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  test("does nothing when the contact is gone", async () => {
    db.lead.findUnique.mockResolvedValue(null);
    db.contact.findUnique.mockResolvedValue(null);

    expect(await assign()).toBeNull();
    expect(db.lead.create).not.toHaveBeenCalled();
  });
});

describe("boards other than Leads", () => {
  test("a move on a Support board syncs nothing, reports no win and runs no rules", async () => {
    vi.mocked(sendWonConversionEvent).mockClear();
    vi.mocked(pushCrmLeadStatus).mockClear();
    vi.mocked(integrationTriggerQueue.add).mockClear();
    db.lead.findUniqueOrThrow.mockResolvedValue({ stageId: "old-stage", stage: { name: "New" } });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Resolved", status: "WON" });
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId: STAGE,
      pipelineId: PIPELINE,
      name: "Aditi",
      email: null,
      phone: "+91",
      source: "WHATSAPP",
      labels: [],
      assignees: [],
      tasks: [],
    });
    db.pipelineStage.findUnique.mockResolvedValue({
      name: "Resolved",
      status: "WON",
      pipelineId: PIPELINE,
      pipeline: { orgId: "org-1", name: "Repairs", type: "SUPPORT" },
    });
    db.contact.findUnique.mockResolvedValue({ id: CONTACT, orgId: "org-1", phone: "+91" });

    await moveLead(LEAD, STAGE, null);

    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
    expect(sendWonConversionEvent).not.toHaveBeenCalled();
  });
});

describe("reporting a win to the Conversions API", () => {
  beforeEach(() => {
    vi.mocked(sendWonConversionEvent).mockClear();
    db.pipelineStage.findUnique.mockResolvedValue({
      name: "Won",
      pipeline: { orgId: "org-1", type: "LEADS" },
    });
    db.contact.findUnique.mockResolvedValue({
      id: CONTACT,
      name: "Aditi",
      email: null,
      phone: "+91",
      source: "WHATSAPP",
      orgId: "org-1",
    });
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId: STAGE,
      name: "Aditi",
      email: null,
      phone: "+91",
      source: "WHATSAPP",
      labels: [],
      assignees: [],
      tasks: [],
    });
  });

  // The board decides a win now, where the contact's lifecycle `isWon` used to.
  test("an open lead moved onto a Won column reports the win", async () => {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: "old-stage",
      stage: { name: "Negotiation", status: "OPEN" },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Won", status: "WON" });

    await moveLead(LEAD, STAGE, null);

    expect(sendWonConversionEvent).toHaveBeenCalledTimes(1);
  });

  // Meta counts every event it receives, so a second one is a double-counted
  // conversion — real money in someone's ad reporting.
  test("moving between two Won columns does not report a second win", async () => {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: "old-won",
      stage: { name: "Won", status: "WON" },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Won (upsell)", status: "WON" });

    await moveLead(LEAD, STAGE, null);

    expect(sendWonConversionEvent).not.toHaveBeenCalled();
  });

  test("a move onto an ordinary column reports nothing", async () => {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: "old-stage",
      stage: { name: "New Lead", status: "OPEN" },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Qualified", status: "OPEN" });

    await moveLead(LEAD, STAGE, null);

    expect(sendWonConversionEvent).not.toHaveBeenCalled();
  });

  // A win is a win whoever recorded it, and reporting it to Meta cannot loop
  // back here — so unlike the CRM fan-out this is not suppressed for inbound.
  test("a win that came from an integration is still reported", async () => {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: "old-stage",
      stage: { name: "Negotiation", status: "OPEN" },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Won", status: "WON" });

    await moveLead(LEAD, STAGE, null, false);

    expect(sendWonConversionEvent).toHaveBeenCalledTimes(1);
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });
});

describe("telling the CRMs a lead changed column", () => {
  const CONTACT_ROW = {
    id: CONTACT,
    orgId: "org-1",
    name: "Aditi",
    email: null,
    phone: "+91",
    source: "WHATSAPP",
    notes: null,
    integrationIds: { zoho: { lead: { id: "zoho-lead-1" } } },
  };

  beforeEach(() => {
    vi.mocked(integrationTriggerQueue.add).mockClear();
    vi.mocked(pushCrmLeadStatus).mockClear();
    vi.mocked(addZapierTriggerToQueue).mockClear();
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: "old-stage",
      stage: { name: "New Lead" },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Qualified", status: "OPEN" });
    // The org is read off the stage's own pipeline, so a lead never syncs into
    // another tenant's integration.
    db.pipelineStage.findUnique.mockResolvedValue({
      name: "Qualified",
      status: "OPEN",
      pipelineId: PIPELINE,
      pipeline: { orgId: "org-1", name: "Sales", type: "LEADS" },
    });
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId: STAGE,
      pipelineId: PIPELINE,
      name: "Aditi",
      email: null,
      phone: "+91",
      source: "WHATSAPP",
      labels: [],
      assignees: [],
      tasks: [],
    });
    db.contact.findUnique.mockResolvedValue(CONTACT_ROW);
  });

  // The board is what drives the CRM now, where the contact's lifecycle used to.
  test("a move enqueues the Bigin deal update keyed on the stage", async () => {
    await moveLead(LEAD, STAGE, null);

    const job = vi.mocked(integrationTriggerQueue.add).mock.calls[0][1];
    expect(job).toMatchObject({ orgId: "org-1", rateupContactId: CONTACT });
    expect(job.data).toMatchObject({ stageId: STAGE });
    // The lifecycle is no longer part of the payload.
    expect(job.data).not.toHaveProperty("lifecycleId");
  });

  // The column is reported, not a `Lead_Status`: which status that becomes is
  // the org's mapping to decide, and pushing the column's own name into Zoho's
  // picklist is what used to be wrong here.
  test("a move reports the column to the Zoho CRM lead", async () => {
    await moveLead(LEAD, STAGE, null);

    expect(pushCrmLeadStatus).toHaveBeenCalledWith(
      "org-1",
      "zoho-lead-1",
      { stageId: STAGE, stageName: "Qualified" },
      {},
      // The lead is passed through so the CRM push can be recorded on its
      // timeline; a Zoho-CRM-only org never reaches the Bigin branch.
      LEAD,
    );
  });

  // The echo guard. A stage Zoho pushed in must not be pushed straight back out,
  // or the webhook it triggers arrives as another inbound change, and so on.
  test("a move that came from an integration syncs nothing back", async () => {
    await moveLead(LEAD, STAGE, null, false);

    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
  });

  // Dropping a lead onto Won or Lost goes through `closeLead`, not `moveLead`.
  // It is still a stage change, and without this the deal stayed open in Bigin.
  test("closing a lead syncs the closing column too", async () => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });
    db.leadTask.updateMany.mockResolvedValue({ count: 0 });

    await closeLead(LEAD, { status: "WON" }, "user-1");

    const job = vi.mocked(integrationTriggerQueue.add).mock.calls[0][1];
    expect(job.data).toMatchObject({ stageId: STAGE });
  });

  test("setContactStage carries the suppression through to the move", async () => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });
    db.lead.findUnique.mockResolvedValue({ id: LEAD, stageId: "old-stage" });

    await setContactStage({
      contactId: CONTACT,
      pipelineId: PIPELINE,
      stageId: STAGE,
      source: "MANUAL",
      channel: "NONE",
      syncIntegrations: false,
    });

    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  // A card someone typed straight onto the board has no customer record behind
  // it, so there is nothing for a CRM to match on.
  // A card typed straight onto the board has no contact behind it, but it does
  // carry a name and a phone — enough for Bigin to open a deal and a contact.
  // It syncs with no `rateupContactId`, since there is nowhere to write the
  // resulting Bigin ids back to.
  test("a lead with no contact still syncs, using its own details", async () => {
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: null,
      stageId: STAGE,
      pipelineId: PIPELINE,
      name: "Walk-in enquiry",
      email: null,
      phone: "+9199",
      source: "MANUAL",
      labels: [],
      assignees: [],
      tasks: [],
    });

    await moveLead(LEAD, STAGE, null);

    const job = vi.mocked(integrationTriggerQueue.add).mock.calls[0][1];
    expect(job.data).toMatchObject({ name: "Walk-in enquiry", phone: "+9199", stageId: STAGE });
    expect(job).not.toHaveProperty("rateupContactId");
    // The lead id is what lets the handler store the Bigin deal id somewhere, so
    // the next move updates that deal instead of opening another.
    expect(job).toMatchObject({ rateupLeadId: LEAD });
    // No contact means no Zoho CRM lead to update either.
    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
  });

  // The board's counterpart to `contact_lifecycle_updated`, which fires from the
  // contact write path and is untouched — a Zap built on the lifecycle trigger
  // keeps working, and this is what an org on the board builds against instead.
  test("a move emits the Contact Stage Updated Zapier trigger", async () => {
    await moveLead(LEAD, STAGE, null);

    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "contact_stage_updated",
      {
        contact_stage_updated: {
          contactId: CONTACT,
          leadId: LEAD,
          pipelineId: PIPELINE,
          pipelineName: "Sales",
          pipelineType: "LEADS",
          stageId: STAGE,
          stageName: "Qualified",
          stageStatus: "OPEN",
        },
      },
      "org-1",
    );
  });

  // A card typed straight onto the board has no contact for the Zap's later
  // steps to look up, so there is nothing to announce.
  test("a lead with no contact emits no Zapier trigger", async () => {
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: null,
      stageId: STAGE,
      pipelineId: PIPELINE,
      name: "Walk-in enquiry",
      email: null,
      phone: "+9199",
      source: "MANUAL",
      labels: [],
      assignees: [],
      tasks: [],
    });

    await moveLead(LEAD, STAGE, null);

    expect(addZapierTriggerToQueue).not.toHaveBeenCalled();
  });

  // Unlike the CRM fan-out, this is outside the `syncIntegrations` guard: that
  // flag stops a change Zoho pushed in from being echoed back to Zoho, but a Zap
  // should still hear about a stage Zoho set.
  test("a move that came from an integration still emits the Zapier trigger", async () => {
    await moveLead(LEAD, STAGE, null, false);

    expect(addZapierTriggerToQueue).toHaveBeenCalled();
  });

  // Both ids ride along: the handler prefers the contact, matching where the
  // lifecycle flow kept the Bigin ids.
  test("a lead with a contact sends both ids", async () => {
    await moveLead(LEAD, STAGE, null);

    expect(vi.mocked(integrationTriggerQueue.add).mock.calls[0][1]).toMatchObject({
      rateupContactId: CONTACT,
      rateupLeadId: LEAD,
    });
  });
});

describe("assigning a stage to many contacts", () => {
  const ORG = "org-1";

  beforeEach(() => {
    db.pipeline.findFirst.mockResolvedValue({ id: PIPELINE });
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Qualified", status: "OPEN" });
    db.contact.findUnique.mockResolvedValue({ name: "Aditi", phone: "+91", email: null });
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
    db.lead.findUnique.mockResolvedValue(null);
  });

  // The ids come from the client and `setContactStage` takes a contact id on
  // trust, so the org filter is the only thing standing between a crafted
  // selection and another tenant's contacts.
  test("narrows the selection to the caller's org before writing", async () => {
    db.contact.findMany.mockResolvedValue([{ id: CONTACT }]);

    const result = await bulkSetContactStage({
      contactIds: [CONTACT, "someone-elses-contact"],
      orgId: ORG,
      stageId: STAGE,
      userId: null,
    });

    expect(db.contact.findMany.mock.calls[0][0].where).toMatchObject({ orgId: ORG });
    expect(result).toMatchObject({ requested: 2, matched: 1, changed: 1 });
    expect(db.lead.create).toHaveBeenCalledTimes(1);
  });

  // A selection routinely holds contacts already sitting on the target column.
  // Those are untouched, and the toast has to be able to say so.
  test("counts contacts already on that column as unchanged", async () => {
    db.contact.findMany.mockResolvedValue([{ id: CONTACT }, { id: "contact-2" }]);
    db.lead.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: LEAD, stageId: STAGE });

    const result = await bulkSetContactStage({
      contactIds: [CONTACT, "contact-2"],
      orgId: ORG,
      stageId: STAGE,
      userId: null,
    });

    expect(result).toMatchObject({ matched: 2, changed: 1, unchanged: 1 });
  });

  test("refuses a stage that is not on the org's board", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(null);

    expect(
      await bulkSetContactStage({
        contactIds: [CONTACT],
        orgId: ORG,
        stageId: STAGE,
        userId: null,
      }),
    ).toBeNull();
    expect(db.contact.findMany).not.toHaveBeenCalled();
  });

  test("does nothing when the org has no board", async () => {
    db.pipeline.findFirst.mockResolvedValue(null);

    expect(
      await bulkSetContactStage({
        contactIds: [CONTACT],
        orgId: ORG,
        stageId: STAGE,
        userId: null,
      }),
    ).toBeNull();
  });
});

describe("clearing a contact's stage", () => {
  test("deletes the lead that held it", async () => {
    db.lead.findUnique.mockResolvedValue({ id: LEAD });

    expect(await clearContactStage(CONTACT, PIPELINE)).toBe(LEAD);
    expect(db.lead.delete).toHaveBeenCalledWith({ where: { id: LEAD } });
  });

  test("does nothing when the contact was never on the board", async () => {
    db.lead.findUnique.mockResolvedValue(null);

    expect(await clearContactStage(CONTACT, PIPELINE)).toBeNull();
    expect(db.lead.delete).not.toHaveBeenCalled();
  });

  // The confirmation is the only guard on an irreversible delete, so it has to
  // be able to name what goes with the lead.
  test("counts what the delete would take with it", async () => {
    db.lead.findUnique.mockResolvedValue({
      id: LEAD,
      stage: { name: "Negotiation" },
      _count: { notes: 3, tasks: 1, activities: 12, assignees: 2 },
    });

    expect(await countContactStageLoss(CONTACT, PIPELINE)).toEqual({
      leadId: LEAD,
      stageName: "Negotiation",
      notes: 3,
      tasks: 1,
      activities: 12,
      assignees: 2,
    });
  });

  test("reports nothing to lose when there is no lead", async () => {
    db.lead.findUnique.mockResolvedValue(null);

    expect(await countContactStageLoss(CONTACT, PIPELINE)).toBeNull();
  });
});

describe("resolving which board a contact's stage lives on", () => {
  test("returns the org's Leads board, never one of its other boards", async () => {
    db.pipeline.findFirst.mockResolvedValue({ id: PIPELINE });

    expect(await resolvePipelineForContact(ORG)).toBe(PIPELINE);
    expect(db.pipeline.findFirst.mock.calls[0][0].where).toEqual({ orgId: ORG, type: "LEADS" });
  });

  // An org that has never opened a board must still be able to edit contacts,
  // so callers get null to skip on rather than an error to handle.
  test("returns null when the org has no board", async () => {
    db.pipeline.findFirst.mockResolvedValue(null);

    expect(await resolvePipelineForContact(ORG)).toBeNull();
  });
});

describe("paging one board column", () => {
  const query = { pipelineId: PIPELINE, limit: 2, filter: "open" } as const;

  // Real ids, because the cursor validates them as UUIDs before it will page.
  const ID: Record<string, string> = {
    a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    c: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  };

  function rows(...keys: string[]) {
    return keys.map((key, index) => ({
      id: ID[key],
      stageEnteredAt: new Date(`2026-09-0${index + 1}T00:00:00.000Z`),
    }));
  }

  /** The hydrate step, deliberately answering in a different order. */
  function hydrated(...keys: string[]) {
    return keys.map((key) => ({
      id: ID[key],
      labels: [],
      tasks: [],
      assignees: [],
      stageId: STAGE,
    }));
  }

  beforeEach(() => {
    db.pipeline.findUniqueOrThrow.mockResolvedValue({ rottingEnabled: true });
  });

  test("returns the page in the order the keyset produced", async () => {
    // `findMany` does not honour the order of an `in`, so a page that comes
    // back shuffled has to be put back into the column's order.
    db.$queryRaw.mockResolvedValue(rows("a", "b"));
    db.lead.findMany.mockResolvedValue(hydrated("b", "a"));

    const page = await listLeads({ ...query }, USER);

    expect(page.items.map((lead: any) => lead.id)).toEqual([ID.a, ID.b]);
  });

  test("offers a cursor only when a row past the page came back", async () => {
    // The query asks for `limit + 1`; the extra row is the whole signal.
    db.$queryRaw.mockResolvedValue(rows("a", "b", "c"));
    db.lead.findMany.mockResolvedValue(hydrated("a", "b"));

    const page = await listLeads({ ...query }, USER);

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeTypeOf("string");
  });

  test("ends the column when the page is not full", async () => {
    db.$queryRaw.mockResolvedValue(rows("a", "b"));
    db.lead.findMany.mockResolvedValue(hydrated("a", "b"));

    expect((await listLeads({ ...query }, USER)).nextCursor).toBeNull();
  });

  test("an empty column asks for nothing and offers no cursor", async () => {
    db.$queryRaw.mockResolvedValue([]);

    const page = await listLeads({ ...query }, USER);

    expect(page).toEqual({ items: [], nextCursor: null });
    expect(db.lead.findMany).not.toHaveBeenCalled();
  });

  test("drops a lead deleted between the two statements", async () => {
    // The ids were read one statement ago; a row that has since gone simply
    // falls out of the page rather than crashing it.
    db.$queryRaw.mockResolvedValue(rows("a", "b"));
    db.lead.findMany.mockResolvedValue(hydrated("a"));

    expect((await listLeads({ ...query }, USER)).items).toHaveLength(1);
  });

  test("refuses a cursor it did not mint", async () => {
    await expect(listLeads({ ...query, cursor: "not-a-cursor" }, USER)).rejects.toBeInstanceOf(
      BadCursorError,
    );
  });

  test("a cursor round trips into the next page", async () => {
    db.$queryRaw.mockResolvedValue(rows("a", "b", "c"));
    db.lead.findMany.mockResolvedValue(hydrated("a", "b"));
    const first = await listLeads({ ...query }, USER);

    db.$queryRaw.mockResolvedValue(rows("c"));
    db.lead.findMany.mockResolvedValue(hydrated("c"));
    const second = await listLeads({ ...query, cursor: first.nextCursor! }, USER);

    expect(second.items.map((lead: any) => lead.id)).toEqual([ID.c]);
  });
});
