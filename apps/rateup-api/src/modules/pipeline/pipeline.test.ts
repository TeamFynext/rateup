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
  DEFAULT_STAGES,
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

  // The board is the org's own, so it starts from the template rather than from
  // anything the inbox happens to hold.
  test("seeds the default funnel, in order, ending in Won and Lost", async () => {
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });

    await createPipeline({
      name: "WhatsApp Sales",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
    });

    const data = db.pipeline.create.mock.calls[0][0].data;
    expect(data.stages.create).toHaveLength(DEFAULT_STAGES.length);
    expect(data.stages.create.map((stage: { name: string }) => stage.name)).toEqual(
      DEFAULT_STAGES.map((stage) => stage.name),
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
    db.teamMember.findMany.mockResolvedValue([{ teamId: "own-team" }]);
    db.pipeline.findFirst.mockResolvedValue(null);
    db.pipeline.create.mockResolvedValue({ id: PIPELINE, stages: [] });

    await createPipeline({
      name: "WhatsApp Sales",
      teamIds: ["own-team"],
      orgId: ORG,
      userId: USER,
    });

    expect(db.lifecycle.findMany).not.toHaveBeenCalled();
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
    db.lead.findFirst.mockResolvedValue(null);
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
    db.lead.findFirst.mockResolvedValue({ id: "existing" });

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
