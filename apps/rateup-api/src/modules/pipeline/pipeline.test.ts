import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    pipeline: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pipelineTeam: { findFirst: vi.fn(), findMany: vi.fn() },
    pipelineStage: {
      findFirst: vi.fn(),
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
    },
    leadActivity: { create: vi.fn(), createMany: vi.fn() },
    leadTask: { updateMany: vi.fn() },
    contact: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    teamMember: { findMany: vi.fn() },
    team: { findMany: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../utils/prisma.js";
import {
  isPipelineMember,
  TeamAccessError,
  createPipeline,
  PipelineLimitError,
  updatePipeline,
} from "./pipeline.service.js";
import {
  verifyOwnerForDelete,
  verifyOwnerForTeamChange,
  verifyPipelineAccess,
} from "./pipeline.auth.js";
import { deleteStage, StageNotEmptyError } from "./pipelineStage/stage.service.js";
import {
  closeLead,
  createLead,
  moveLead,
  openLeadOnPipelineForContact,
  syncLeadsToContactLifecycle,
  updateLead,
} from "./pipelineLead/lead.service.js";
import { createLeadRequestSchema } from "./pipelineLead/lead.schema.js";
import { createStageRequestSchema } from "./pipelineStage/stage.schema.js";

const db = prisma as unknown as Record<string, any>;

const USER = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-4222-8222-222222222222";
const PIPELINE = "33333333-3333-4333-8333-333333333333";
const STAGE = "44444444-4444-4444-8444-444444444444";
const NEXT_STAGE = "55555555-5555-4555-8555-555555555555";
const LEAD = "66666666-6666-4666-8666-666666666666";
const CONTACT = "77777777-7777-4777-8777-777777777777";
const LIFECYCLE = "88888888-8888-4888-8888-888888888888";
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
});

describe("pipeline access", () => {
  test("a member of one of the pipeline's teams has access", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue({ pipelineId: PIPELINE });
    await expect(isPipelineMember(PIPELINE, USER)).resolves.toBe(true);
  });

  test("someone on none of its teams does not", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue(null);
    await expect(isPipelineMember(PIPELINE, USER)).resolves.toBe(false);
  });

  test("the guard answers 403 rather than letting the handler run", async () => {
    db.pipelineTeam.findFirst.mockResolvedValue(null);
    const rep = reply();

    await verifyPipelineAccess({ params: { id: PIPELINE }, userId: USER } as any, rep);

    expect(answer(rep).code).toBe(403);
  });
});

// Board tuning is for whoever works the board; handing it to another team or
// deleting it is not. The UI hides both, and these keep the routes honest.
describe("owner-only pipeline actions", () => {
  const member = (body: unknown) => ({ params: { id: PIPELINE }, body, user: { role: "MEMBER" } });
  const owner = (body: unknown) => ({
    params: { id: PIPELINE },
    body,
    user: { role: "SUPER_ADMIN" },
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
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);

    await expect(
      createPipeline({
        name: "WhatsApp Sales",
        teamIds: ["own-team", "someone-elses-team"],
        orgId: ORG,
        userId: USER,
      }),
    ).rejects.toBeInstanceOf(TeamAccessError);
    expect(db.pipeline.create).not.toHaveBeenCalled();
  });

  // The board's columns are the org's lifecycle stages — there is no canned
  // funnel to fall back on, so an org with no lifecycles gets no columns.
  test("seeds one stage per lifecycle, in lifecycle order", async () => {
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });
    db.lifecycle.findMany.mockResolvedValue([
      { id: LIFECYCLE, name: "New Lead", ordering: 0, color: "#16A34A", isWon: false },
      { id: "won-lifecycle", name: "Won", ordering: 1, color: "#1C518E", isWon: true },
    ]);

    await createPipeline({
      name: "WhatsApp Sales",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
    });

    expect(db.lifecycle.findMany.mock.calls[0][0]).toMatchObject({
      where: { orgId: ORG },
      orderBy: { ordering: "asc" },
    });

    const data = db.pipeline.create.mock.calls[0][0].data;
    expect(data.stages.create).toEqual([
      {
        name: "New Lead",
        order: 0,
        color: "#16A34A",
        isWon: false,
        probability: 0,
        rottingDays: 0,
        lifecycleId: LIFECYCLE,
      },
      {
        name: "Won",
        order: 1,
        color: "#1C518E",
        isWon: true,
        probability: 100,
        rottingDays: 0,
        lifecycleId: "won-lifecycle",
      },
    ]);
    expect(data.lostReasons.create.length).toBeGreaterThan(0);
  });

  test("an org with no lifecycles gets a pipeline with no columns", async () => {
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });

    await createPipeline({
      name: "WhatsApp Sales",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
    });

    expect(db.pipeline.create.mock.calls[0][0].data.stages.create).toEqual([]);
  });

  // One board per org for now. The count is per-org, so another org having one
  // must not block this one.
  test("refuses a second pipeline in the same org", async () => {
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);
    db.pipeline.count.mockResolvedValue(1);

    await expect(
      createPipeline({
        name: "Second board",
        teamIds: ["own-team"],
        orgId: ORG,
        userId: USER,
      }),
    ).rejects.toBeInstanceOf(PipelineLimitError);

    expect(db.pipeline.count.mock.calls[0][0]).toMatchObject({ where: { orgId: ORG } });
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
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);

    await expect(
      updatePipeline(PIPELINE, { teamIds: ["own-team", "someone-elses-team"] }, USER),
    ).rejects.toBeInstanceOf(TeamAccessError);
    expect(db.pipeline.update).not.toHaveBeenCalled();
  });

  // Otherwise a board shared with a team you are not on would reject every edit,
  // including ones that leave that team exactly where it is.
  test("lets a team already on the board be kept", async () => {
    db.pipelineTeam.findMany.mockResolvedValue([{ teamId: "own-team" }, { teamId: "their-team" }]);
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);

    await updatePipeline(PIPELINE, { teamIds: ["own-team", "their-team"] }, USER);

    expect(db.pipeline.update.mock.calls[0][0].data.teams.createMany.data).toEqual([
      { teamId: "own-team" },
      { teamId: "their-team" },
    ]);
  });

  test("a team taken off the board stops filing contacts onto it", async () => {
    db.pipelineTeam.findMany.mockResolvedValue([{ teamId: "own-team" }, { teamId: "dropped" }]);
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }, { teamId: "dropped" }]);

    await updatePipeline(PIPELINE, { teamIds: ["own-team"] }, USER);

    expect(db.team.updateMany).toHaveBeenCalledWith({
      where: { defaultPipelineId: PIPELINE, id: { notIn: ["own-team"] } },
      data: { defaultPipelineId: null, autoCreateLeads: false },
    });
  });

  test("an edit that does not touch teams leaves the routing alone", async () => {
    await updatePipeline(PIPELINE, { rottingEnabled: false }, USER);

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
  function movingInto(overrides: { isWon?: boolean; lifecycleSyncEnabled?: boolean } = {}) {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: STAGE,
      contactId: CONTACT,
      stage: { name: "Contacted" },
      pipeline: { lifecycleSyncEnabled: overrides.lifecycleSyncEnabled ?? true },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({
      name: "Qualified",
      isWon: overrides.isWon ?? false,
    });
    // The lifecycle sync reads the destination stage separately.
    db.pipelineStage.findUnique.mockResolvedValue({
      lifecycle: { id: LIFECYCLE, name: "Hot Lead" },
    });
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId: NEXT_STAGE,
      labels: [],
      assignees: [],
      tasks: [],
    });
    db.contact.findUnique.mockResolvedValue({ lifecycleId: null });
  }

  test("restamps the stage clock and records the move", async () => {
    movingInto();

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.stageId).toBe(NEXT_STAGE);
    expect(update.stageEnteredAt).toBeInstanceOf(Date);
    expect(db.leadActivity.createMany.mock.calls[0][0].data[0]).toMatchObject({
      type: "MOVED",
      details: { fromStageName: "Contacted", toStageName: "Qualified" },
    });
  });

  test("writes the stage's lifecycle onto the contact", async () => {
    movingInto();

    await moveLead(LEAD, NEXT_STAGE, USER);

    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: CONTACT },
      data: { lifecycleId: LIFECYCLE },
    });
  });

  test("leaves the contact alone when the pipeline has sync switched off", async () => {
    movingInto({ lifecycleSyncEnabled: false });

    await moveLead(LEAD, NEXT_STAGE, USER);

    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("leaves the contact alone when it already sits on that lifecycle", async () => {
    movingInto();
    db.contact.findUnique.mockResolvedValue({ lifecycleId: LIFECYCLE });

    await moveLead(LEAD, NEXT_STAGE, USER);

    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("landing on the won stage closes the lead", async () => {
    movingInto({ isWon: true });

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("WON");
    expect(update.closedAt).toBeInstanceOf(Date);
  });

  test("leaving the won stage reopens it and clears the close", async () => {
    movingInto({ isWon: false });

    await moveLead(LEAD, NEXT_STAGE, USER);

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("OPEN");
    expect(update.closedAt).toBeNull();
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
    db.contact.findUnique.mockResolvedValue({ lifecycleId: null });
    db.pipelineStage.findUnique.mockResolvedValue({ lifecycle: null });
  });

  test("a win moves the lead onto the won stage", async () => {
    db.pipelineStage.findFirst.mockResolvedValue({ id: NEXT_STAGE, name: "Won" });

    await closeLead(LEAD, { status: "WON" }, USER);

    expect(db.lead.update.mock.calls[0][0].data).toMatchObject({
      status: "WON",
      stageId: NEXT_STAGE,
      lostReasonId: null,
    });
  });

  test("a loss keeps the lead where it stalled and records the reason", async () => {
    db.pipelineLostReason.findUnique.mockResolvedValue({ label: "Price too high" });

    await closeLead(
      LEAD,
      { status: "LOST", lostReasonId: REASON, note: "Went with a rival" },
      USER,
    );

    const update = db.lead.update.mock.calls[0][0].data;
    expect(update.status).toBe("LOST");
    expect(update.lostReasonId).toBe(REASON);
    expect(update.stageId).toBeUndefined();
    expect(db.leadActivity.createMany.mock.calls[0][0].data[0].details).toMatchObject({
      lostReasonLabel: "Price too high",
      note: "Went with a rival",
    });
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
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({
      isWon: false,
      pipeline: { lifecycleSyncEnabled: false },
    });
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
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

    const [created] = db.leadActivity.createMany.mock.calls[0][0].data;
    expect(created).toMatchObject({ type: "CREATED", userId: USER });
    expect(created.details.automated).toBe(true);
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

    const [created] = db.leadActivity.createMany.mock.calls[0][0].data;
    expect(created.details.automated).toBeUndefined();
  });
});

describe("a rule opening a lead on a named pipeline", () => {
  beforeEach(() => {
    db.lead.findFirst.mockResolvedValue(null);
    db.pipelineStage.findFirst.mockResolvedValue({ id: STAGE });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({
      isWon: false,
      pipeline: { lifecycleSyncEnabled: false },
    });
    db.contact.findUnique.mockResolvedValue({ name: "Aditi", phone: "+91", email: null });
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
  });

  function open() {
    return openLeadOnPipelineForContact({
      contactId: CONTACT,
      pipelineId: PIPELINE,
      lifecycleId: LIFECYCLE,
      source: "WHATSAPP",
      channel: "WHATSAPP",
    });
  }

  test("lands in the column that maps the lifecycle", async () => {
    await open();

    expect(db.pipelineStage.findFirst).toHaveBeenCalledWith({
      where: { pipelineId: PIPELINE, lifecycleId: LIFECYCLE },
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
    db.lead.findFirst.mockResolvedValue({ id: "existing" });

    expect(await open()).toBeNull();
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  // Its first stage would claim the lead reached a phase it has not.
  test("does nothing when the board has no column for the lifecycle", async () => {
    db.pipelineStage.findFirst.mockResolvedValue(null);

    expect(await open()).toBeNull();
    expect(db.lead.create).not.toHaveBeenCalled();
  });
});

// A rule names the board it wants, so it must not also fan the contact out across
// every team that happens to have auto-add on.
describe("a lifecycle sync that skips team defaults", () => {
  test("moves the open leads but opens none", async () => {
    db.lead.findMany.mockResolvedValue([{ id: LEAD, pipelineId: PIPELINE }]);
    db.pipelineStage.findMany.mockResolvedValue([{ id: NEXT_STAGE, pipelineId: PIPELINE }]);
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: STAGE,
      contactId: CONTACT,
      stage: { name: "New Lead" },
      pipeline: { lifecycleSyncEnabled: true },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Qualified", isWon: false });
    db.lead.update.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });

    const result = await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER, {
      openOnTeamDefaults: false,
    });

    expect(result).toHaveLength(1);
    expect(db.lead.update).toHaveBeenCalled();
    // The team-defaults pass is what reads `team`; it must not have run.
    expect(db.team.findMany).not.toHaveBeenCalled();
    expect(db.lead.create).not.toHaveBeenCalled();
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

describe("a contact's lifecycle changing", () => {
  const OTHER_PIPELINE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  function movesInto(stageId: string) {
    db.lead.findUniqueOrThrow.mockResolvedValue({
      stageId: STAGE,
      contactId: CONTACT,
      stage: { name: "New Lead" },
      pipeline: { lifecycleSyncEnabled: true },
    });
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({ name: "Qualified", isWon: false });
    db.pipelineStage.findUnique.mockResolvedValue({
      lifecycle: { id: LIFECYCLE, name: "Hot Lead" },
    });
    db.contact.findUnique.mockResolvedValue({ lifecycleId: LIFECYCLE });
    db.lead.update.mockResolvedValue({
      id: LEAD,
      contactId: CONTACT,
      stageId,
      labels: [],
      assignees: [],
      tasks: [],
    });
  }

  test("moves the contact's open leads into the column that maps to it", async () => {
    db.lead.findMany.mockResolvedValue([{ id: LEAD, pipelineId: PIPELINE }]);
    db.pipelineStage.findMany.mockResolvedValue([{ id: NEXT_STAGE, pipelineId: PIPELINE }]);
    movesInto(NEXT_STAGE);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.update.mock.calls[0][0].data).toMatchObject({ stageId: NEXT_STAGE });
  });

  // The query does the filtering, so the guarantees live in its `where`.
  test("only looks at open leads on pipelines with sync switched on", async () => {
    db.lead.findMany.mockResolvedValue([]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.findMany.mock.calls[0][0].where).toMatchObject({
      contactId: { in: [CONTACT] },
      status: "OPEN",
      pipeline: { lifecycleSyncEnabled: true },
      stage: { lifecycleId: { not: LIFECYCLE } },
    });
    expect(db.lead.update).not.toHaveBeenCalled();
  });

  // Several stages can map to one lifecycle; the lead belongs at the front of
  // that phase, not scattered across it.
  test("lands on the first stage carrying the lifecycle", async () => {
    db.lead.findMany.mockResolvedValue([{ id: LEAD, pipelineId: PIPELINE }]);
    db.pipelineStage.findMany.mockResolvedValue([
      { id: NEXT_STAGE, pipelineId: PIPELINE },
      { id: "later-stage", pipelineId: PIPELINE },
    ]);
    movesInto(NEXT_STAGE);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.update.mock.calls[0][0].data).toMatchObject({ stageId: NEXT_STAGE });
    expect(db.pipelineStage.findMany.mock.calls[0][0]).toMatchObject({
      orderBy: { order: "asc" },
    });
  });

  test("leaves a lead alone when its pipeline never mapped that lifecycle", async () => {
    db.lead.findMany.mockResolvedValue([{ id: LEAD, pipelineId: OTHER_PIPELINE }]);
    db.pipelineStage.findMany.mockResolvedValue([{ id: NEXT_STAGE, pipelineId: PIPELINE }]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.update).not.toHaveBeenCalled();
  });

  test("clearing a contact's lifecycle moves nothing", async () => {
    await syncLeadsToContactLifecycle([CONTACT], null, ORG, USER);

    expect(db.lead.findMany).not.toHaveBeenCalled();
  });
});

describe("a team's default pipeline", () => {
  const TEAM = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const OTHER_TEAM = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const OTHER_PIPELINE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  beforeEach(() => {
    // Nothing to move; these tests are about what gets opened.
    db.lead.findMany.mockResolvedValue([]);
    db.pipelineStage.findMany.mockResolvedValue([{ id: NEXT_STAGE, pipelineId: PIPELINE }]);
    db.pipelineStage.findUniqueOrThrow.mockResolvedValue({
      isWon: false,
      pipeline: { lifecycleSyncEnabled: true },
    });
    db.pipelineStage.findUnique.mockResolvedValue({ lifecycle: null });
    db.contact.findMany.mockResolvedValue([
      { id: CONTACT, name: "Meera Joshi", phone: "+911", email: null },
    ]);
    db.lead.create.mockResolvedValue({ id: LEAD, labels: [], assignees: [], tasks: [] });
  });

  test("opens a lead on the board when the contact is not on it yet", async () => {
    db.team.findMany.mockResolvedValue([{ id: TEAM, defaultPipelineId: PIPELINE }]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.create.mock.calls[0][0].data).toMatchObject({
      pipelineId: PIPELINE,
      stageId: NEXT_STAGE,
      contactId: CONTACT,
      teamId: TEAM,
    });
  });

  // Opt-in: the query is the guarantee, so assert what it asks for.
  test("ignores teams that have not switched auto-create on", async () => {
    db.team.findMany.mockResolvedValue([]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.team.findMany.mock.calls[0][0].where).toMatchObject({
      autoCreateLeads: true,
      defaultPipelineId: { not: null },
    });
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  // Both queries that could cross a tenant are asserted here: the teams whose
  // boards receive the lead, and the contacts copied onto them.
  test("only looks at teams and contacts in the caller's org", async () => {
    db.team.findMany.mockResolvedValue([{ id: TEAM, defaultPipelineId: PIPELINE }]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.team.findMany.mock.calls[0][0].where).toMatchObject({ orgId: ORG });
    expect(db.contact.findMany.mock.calls[0][0].where).toMatchObject({ orgId: ORG });
  });

  // Two teams, one board: the contact belongs on it once.
  test("two teams sharing a board produce one lead between them", async () => {
    db.team.findMany.mockResolvedValue([
      { id: TEAM, defaultPipelineId: PIPELINE },
      { id: OTHER_TEAM, defaultPipelineId: PIPELINE },
    ]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.create).toHaveBeenCalledTimes(1);
    expect(db.lead.create.mock.calls[0][0].data).toMatchObject({ teamId: TEAM });
  });

  test("a contact already on the board is left alone", async () => {
    db.team.findMany.mockResolvedValue([{ id: TEAM, defaultPipelineId: PIPELINE }]);
    db.lead.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contactId: CONTACT, pipelineId: PIPELINE }]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.create).not.toHaveBeenCalled();
  });

  // Without a column for the lifecycle there is nowhere honest to put the lead.
  test("a board with no column for that lifecycle opens nothing", async () => {
    db.team.findMany.mockResolvedValue([{ id: TEAM, defaultPipelineId: OTHER_PIPELINE }]);
    db.pipelineStage.findMany.mockResolvedValue([]);

    await syncLeadsToContactLifecycle([CONTACT], LIFECYCLE, ORG, USER);

    expect(db.lead.create).not.toHaveBeenCalled();
  });
});

describe("request schemas", () => {
  test("a stage probability outside 0-100 is rejected", () => {
    const base = { pipelineId: PIPELINE, name: "Qualified" };
    expect(createStageRequestSchema.safeParse({ ...base, probability: 45 }).success).toBe(true);
    expect(createStageRequestSchema.safeParse({ ...base, probability: 145 }).success).toBe(false);
    expect(createStageRequestSchema.safeParse({ ...base, probability: -1 }).success).toBe(false);
  });

  test("a stage colour has to be a #rrggbb hex", () => {
    const base = { pipelineId: PIPELINE, name: "Qualified" };
    expect(createStageRequestSchema.safeParse({ ...base, color: "#1C518E" }).success).toBe(true);
    expect(createStageRequestSchema.safeParse({ ...base, color: "blue" }).success).toBe(false);
  });

  test("a lead defaults to a manual, channel-less source", () => {
    const parsed = createLeadRequestSchema.parse({
      pipelineId: PIPELINE,
      stageId: STAGE,
      name: "Meera Joshi",
    });
    expect(parsed.source).toBe("MANUAL");
    expect(parsed.channel).toBe("NONE");
  });
});
