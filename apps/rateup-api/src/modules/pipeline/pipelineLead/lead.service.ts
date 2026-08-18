import type { LeadChannel, LeadSource } from "../../../../generated/prisma/client.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type {
  BulkUpdateLeadsRequestSchema,
  CloseLeadRequestSchema,
  CreateLeadRequestSchema,
  CreateNoteRequestSchema,
  CreateTaskRequestSchema,
  UpdateLeadRequestSchema,
  UpdateTaskRequestSchema,
} from "./lead.schema.js";

/** Everything the board, list, forecast and insights views read off a lead. */
const leadListInclude = {
  assignees: {
    orderBy: { createdAt: "asc" },
    include: { assignee: { select: { id: true, name: true, profilePhoto: true } } },
  },
  owner: { select: { id: true, name: true, profilePhoto: true } },
  team: { select: { id: true, name: true, color: true } },
  contact: { select: { id: true, name: true, phone: true } },
  stage: { select: { id: true, name: true, probability: true, rottingDays: true, isWon: true } },
  lostReason: { select: { id: true, label: true } },
  labels: { include: { label: true } },
  tasks: {
    where: { completedAt: null },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 1,
  },
} satisfies Prisma.LeadInclude;

type RawLead = Prisma.LeadGetPayload<{ include: typeof leadListInclude }>;

/** Flattens the join rows and lifts the single open task to `nextTask`. */
function serialiseLead({ labels, tasks, assignees, ...lead }: RawLead) {
  return {
    ...lead,
    labels: labels.map((l) => l.label),
    assignees: assignees.map((a) => a.assignee),
    nextTask: tasks[0] ?? null,
  };
}

async function replaceAssignees(tx: Prisma.TransactionClient, leadId: string, next: string[]) {
  const before = await tx.leadAssignee.findMany({
    where: { leadId },
    include: { assignee: { select: { id: true, name: true } } },
  });

  const wanted = new Set(next);
  const had = new Set(before.map((row) => row.assigneeId));

  const removed = before.filter((row) => !wanted.has(row.assigneeId));
  const addedIds = next.filter((id) => !had.has(id));
  if (!removed.length && !addedIds.length) return null;

  if (removed.length) {
    await tx.leadAssignee.deleteMany({
      where: { leadId, assigneeId: { in: removed.map((row) => row.assigneeId) } },
    });
  }
  if (addedIds.length) {
    await tx.leadAssignee.createMany({
      data: addedIds.map((assigneeId) => ({ leadId, assigneeId })),
      skipDuplicates: true,
    });
  }

  const added = await tx.user.findMany({
    where: { id: { in: addedIds } },
    select: { name: true },
  });

  return {
    addedNames: added.map((user) => user.name ?? "Someone"),
    removedNames: removed.map((row) => row.assignee.name ?? "Someone"),
  };
}

export async function getLeads(pipelineId: string) {
  const leads = await prisma.lead.findMany({
    where: { pipelineId },
    orderBy: { createdAt: "desc" },
    include: leadListInclude,
  });
  return leads.map(serialiseLead);
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ...leadListInclude,
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, profilePhoto: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true, profilePhoto: true } } },
      },
    },
  });

  if (!lead) return null;
  const { notes, activities, ...rest } = lead;
  return { ...serialiseLead(rest), notes, activities };
}

export async function getPipelineIdByLeadId(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { pipelineId: true } });
  return lead?.pipelineId;
}

export async function getPipelineIdByNoteId(id: string) {
  const note = await prisma.leadNote.findUnique({
    where: { id },
    select: { lead: { select: { pipelineId: true } } },
  });
  return note?.lead.pipelineId;
}

export async function getPipelineIdByTaskId(id: string) {
  const task = await prisma.leadTask.findUnique({
    where: { id },
    select: { lead: { select: { pipelineId: true } } },
  });
  return task?.lead.pipelineId;
}

async function syncContactLifecycle(
  tx: Prisma.TransactionClient,
  input: { contactId: string | null; stageId: string; pipelineLifecycleSyncEnabled: boolean },
) {
  if (!input.contactId || !input.pipelineLifecycleSyncEnabled) return null;

  const stage = await tx.pipelineStage.findUnique({
    where: { id: input.stageId },
    select: { lifecycle: { select: { id: true, name: true } } },
  });
  if (!stage?.lifecycle) return null;

  const contact = await tx.contact.findUnique({
    where: { id: input.contactId },
    select: { lifecycleId: true },
  });
  if (contact?.lifecycleId === stage.lifecycle.id) return null;

  await tx.contact.update({
    where: { id: input.contactId },
    data: { lifecycleId: stage.lifecycle.id },
  });
  return stage.lifecycle.name;
}

export async function createLead(
  data: CreateLeadRequestSchema & {
    userId: string | null;
    automated?: boolean;
  },
) {
  const stage = await prisma.pipelineStage.findUniqueOrThrow({
    where: { id: data.stageId },
    select: { isWon: true, pipeline: { select: { lifecycleSyncEnabled: true } } },
  });

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        name: data.name,
        company: data.company,
        phone: data.phone,
        email: data.email,
        source: data.source,
        channel: data.channel,
        teamId: data.teamId ?? null,
        contactId: data.contactId ?? null,
        ownerId: data.automated ? null : data.userId,
        expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
        status: stage.isWon ? "WON" : "OPEN",
        closedAt: stage.isWon ? new Date() : null,
        ...(data.labelIds?.length && {
          labels: { createMany: { data: data.labelIds.map((labelId) => ({ labelId })) } },
        }),
        ...(data.assigneeIds?.length && {
          assignees: {
            createMany: { data: data.assigneeIds.map((assigneeId) => ({ assigneeId })) },
          },
        }),
      },
      include: leadListInclude,
    });

    const lifecycleName = await syncContactLifecycle(tx, {
      contactId: lead.contactId,
      stageId: lead.stageId,
      pipelineLifecycleSyncEnabled: stage.pipeline.lifecycleSyncEnabled,
    });

    await tx.leadActivity.createMany({
      data: [
        {
          leadId: lead.id,
          userId: data.userId,
          type: "CREATED",
          // `userId` is kept on an automated entry: the rule opened the lead, but
          // knowing whose lifecycle change set it off is the useful part.
          details: { sourceLabel: data.source, ...(data.automated && { automated: true }) },
        },
        ...(lifecycleName
          ? [
              {
                leadId: lead.id,
                userId: data.userId,
                type: "LIFECYCLE_SYNCED",
                details: { lifecycleName },
              },
            ]
          : []),
      ],
    });

    return serialiseLead(lead);
  });
}

export async function updateLead(id: string, data: UpdateLeadRequestSchema, userId: string) {
  return prisma.$transaction(async (tx) => {
    // The join rows are rewritten before the lead is read back, so the returned
    // lead already carries the new assignee list.
    const assigneeChange =
      data.assigneeIds === undefined ? null : await replaceAssignees(tx, id, data.assigneeIds);

    const lead = await tx.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.channel !== undefined && { channel: data.channel }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
        ...(data.contactId !== undefined && { contactId: data.contactId }),
        ...(data.expectedCloseAt !== undefined && {
          expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
        }),
        ...(data.labelIds !== undefined && {
          labels: {
            deleteMany: {},
            createMany: { data: data.labelIds.map((labelId) => ({ labelId })) },
          },
        }),
      },
      include: leadListInclude,
    });

    if (assigneeChange) {
      await tx.leadActivity.create({
        data: { leadId: id, userId, type: "ASSIGNEES_CHANGED", details: assigneeChange },
      });
    }

    return serialiseLead(lead);
  });
}

export async function moveLead(id: string, stageId: string, userId: string | null) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.lead.findUniqueOrThrow({
      where: { id },
      select: {
        stageId: true,
        contactId: true,
        stage: { select: { name: true } },
        pipeline: { select: { lifecycleSyncEnabled: true } },
      },
    });

    const target = await tx.pipelineStage.findUniqueOrThrow({
      where: { id: stageId },
      select: { name: true, isWon: true },
    });

    const now = new Date();
    const lead = await tx.lead.update({
      where: { id },
      data: {
        stageId,
        stageEnteredAt: now,
        lastActivityAt: now,
        // Landing on the won stage closes the lead; leaving it reopens.
        status: target.isWon ? "WON" : "OPEN",
        closedAt: target.isWon ? now : null,
        closedById: target.isWon ? userId : null,
        lostReasonId: null,
      },
      include: leadListInclude,
    });

    const lifecycleName = await syncContactLifecycle(tx, {
      contactId: lead.contactId,
      stageId,
      pipelineLifecycleSyncEnabled: before.pipeline.lifecycleSyncEnabled,
    });

    await tx.leadActivity.createMany({
      data: [
        {
          leadId: id,
          userId,
          type: target.isWon ? "WON" : "MOVED",
          details: { fromStageName: before.stage.name, toStageName: target.name },
        },
        ...(lifecycleName
          ? [{ leadId: id, userId, type: "LIFECYCLE_SYNCED", details: { lifecycleName } }]
          : []),
      ],
    });

    return serialiseLead(lead);
  });
}

export async function syncLeadsToContactLifecycle(
  contactIds: string[],
  lifecycleId: string | null,
  orgId: string,
  userId: string | null = null,
  options: {
    openOnTeamDefaults?: boolean;
  } = {},
) {
  if (!contactIds.length || !lifecycleId) return [];

  const leads = await prisma.lead.findMany({
    where: {
      contactId: { in: contactIds },
      status: "OPEN",
      pipeline: { lifecycleSyncEnabled: true },
      // Already in a column for this lifecycle — nothing to do.
      stage: { lifecycleId: { not: lifecycleId } },
    },
    select: { id: true, pipelineId: true },
  });

  const pipelineIds = [...new Set(leads.map((lead) => lead.pipelineId))];
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: { in: pipelineIds }, lifecycleId },
    orderBy: { order: "asc" },
    select: { id: true, pipelineId: true },
  });

  // First stage carrying the lifecycle wins, which is where a lead entering that
  // phase belongs.
  const targetByPipeline = new Map<string, string>();
  for (const stage of stages) {
    if (!targetByPipeline.has(stage.pipelineId)) targetByPipeline.set(stage.pipelineId, stage.id);
  }

  const moved = [];
  for (const lead of leads) {
    const stageId = targetByPipeline.get(lead.pipelineId);
    // A pipeline that never mapped this lifecycle has no column to move into.
    if (!stageId) continue;
    moved.push(await moveLead(lead.id, stageId, userId));
  }

  if (options.openOnTeamDefaults === false) return moved;

  const opened = await openLeadsOnTeamDefaults(contactIds, lifecycleId, orgId, userId);
  return [...moved, ...opened];
}

export async function openLeadOnPipelineForContact({
  contactId,
  pipelineId,
  lifecycleId,
  source,
  channel,
  userId = null,
}: {
  contactId: string;
  pipelineId: string;
  lifecycleId: string;
  source: LeadSource;
  channel: LeadChannel;
  userId?: string | null;
}) {
  const existing = await prisma.lead.findFirst({
    where: { contactId, pipelineId },
    select: { id: true },
  });
  if (existing) return null;

  const stage = await prisma.pipelineStage.findFirst({
    where: { pipelineId, lifecycleId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (!stage) return null;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { name: true, phone: true, email: true },
  });
  if (!contact) return null;

  return createLead({
    pipelineId,
    stageId: stage.id,
    contactId,
    name: contact.name ?? "Unnamed contact",
    phone: contact.phone,
    email: contact.email,
    source,
    channel,
    // The rule names a board, not a team; whoever picks the lead up sets that.
    teamId: null,
    userId,
    automated: true,
  });
}

async function openLeadsOnTeamDefaults(
  contactIds: string[],
  lifecycleId: string,
  orgId: string,
  userId: string | null,
) {
  // `orgId` is what keeps this inside one tenant. Everything below is reached
  // from the team's default pipeline, so without it a board in another org that
  // maps the same lifecycle would receive the contact's name, phone and email.
  const teams = await prisma.team.findMany({
    where: { orgId, autoCreateLeads: true, defaultPipelineId: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, defaultPipelineId: true },
  });
  if (!teams.length) return [];

  // One entry per board, remembering which team to stamp on the new lead.
  const teamByPipeline = new Map<string, string>();
  for (const team of teams) {
    if (!teamByPipeline.has(team.defaultPipelineId!)) {
      teamByPipeline.set(team.defaultPipelineId!, team.id);
    }
  }
  const pipelineIds = [...teamByPipeline.keys()];

  // Only boards that have a column for this lifecycle; the rest have nowhere to
  // put the lead and are skipped rather than defaulted to their first stage.
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: { in: pipelineIds }, lifecycleId },
    orderBy: { order: "asc" },
    select: { id: true, pipelineId: true },
  });
  const stageByPipeline = new Map<string, string>();
  for (const stage of stages) {
    if (!stageByPipeline.has(stage.pipelineId)) stageByPipeline.set(stage.pipelineId, stage.id);
  }
  if (!stageByPipeline.size) return [];

  // A contact already on a board keeps the lead they have, whatever state it is
  // in — a closed lead means someone decided, and re-adding would undo that.
  const existing = await prisma.lead.findMany({
    where: { contactId: { in: contactIds }, pipelineId: { in: [...stageByPipeline.keys()] } },
    select: { contactId: true, pipelineId: true },
  });
  const taken = new Set(existing.map((lead) => `${lead.contactId}:${lead.pipelineId}`));

  const contacts = await prisma.contact.findMany({
    // Scoped again here: a caller passing an id from another org would otherwise
    // copy that contact onto this org's board.
    where: { id: { in: contactIds }, orgId },
    select: { id: true, name: true, phone: true, email: true },
  });

  const created = [];
  for (const contact of contacts) {
    for (const [pipelineId, stageId] of stageByPipeline) {
      if (taken.has(`${contact.id}:${pipelineId}`)) continue;
      created.push(
        await createLead({
          pipelineId,
          stageId,
          contactId: contact.id,
          name: contact.name ?? "Unnamed contact",
          phone: contact.phone,
          email: contact.email,
          source: "MANUAL",
          channel: "NONE",
          teamId: teamByPipeline.get(pipelineId) ?? null,
          userId,
          automated: true,
        }),
      );
    }
  }
  return created;
}

export async function closeLead(id: string, data: CloseLeadRequestSchema, userId: string) {
  return prisma.$transaction(async (tx) => {
    const isWon = data.status === "WON";
    const now = new Date();

    // Winning moves the lead onto the pipeline's won stage so the board shows it
    // in the right column; losing leaves it where it stalled.
    const wonStage = isWon
      ? await tx.pipelineStage.findFirst({
          where: { pipeline: { leads: { some: { id } } }, isWon: true },
          orderBy: { order: "asc" },
          select: { id: true, name: true },
        })
      : null;

    const reason = data.lostReasonId
      ? await tx.pipelineLostReason.findUnique({
          where: { id: data.lostReasonId },
          select: { label: true },
        })
      : null;

    const lead = await tx.lead.update({
      where: { id },
      data: {
        status: data.status,
        closedAt: now,
        closedById: userId,
        lastActivityAt: now,
        lostReasonId: isWon ? null : (data.lostReasonId ?? null),
        ...(wonStage && { stageId: wonStage.id, stageEnteredAt: now }),
      },
      include: leadListInclude,
    });

    // A closed lead's open tasks are noise on someone's list.
    await tx.leadTask.updateMany({
      where: { leadId: id, completedAt: null },
      data: { completedAt: now },
    });

    const lifecycleName = isWon
      ? await syncContactLifecycle(tx, {
          contactId: lead.contactId,
          stageId: lead.stageId,
          pipelineLifecycleSyncEnabled: true,
        })
      : null;

    await tx.leadActivity.createMany({
      data: [
        {
          leadId: id,
          userId,
          type: data.status,
          details: {
            ...(reason && { lostReasonLabel: reason.label }),
            ...(data.note && { note: data.note }),
          },
        },
        ...(lifecycleName
          ? [{ leadId: id, userId, type: "LIFECYCLE_SYNCED", details: { lifecycleName } }]
          : []),
      ],
    });

    return serialiseLead(lead);
  });
}

export async function reopenLead(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        status: "OPEN",
        closedAt: null,
        closedById: null,
        lostReasonId: null,
        lastActivityAt: new Date(),
      },
      include: leadListInclude,
    });

    await tx.leadActivity.create({ data: { leadId: id, userId, type: "REOPENED" } });
    return serialiseLead(lead);
  });
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}

export async function bulkUpdateLeads(data: BulkUpdateLeadsRequestSchema, userId: string) {
  if (data.stageId) {
    for (const leadId of data.leadIds) {
      await moveLead(leadId, data.stageId, userId);
    }
  }

  if (data.teamId !== undefined) {
    await prisma.lead.updateMany({
      where: { id: { in: data.leadIds } },
      data: { teamId: data.teamId },
    });
  }

  // Reassignment runs per lead so each one records who joined and who left,
  // exactly as a single-lead edit would.
  if (data.assigneeIds !== undefined) {
    for (const leadId of data.leadIds) {
      await prisma.$transaction(async (tx) => {
        const change = await replaceAssignees(tx, leadId, data.assigneeIds ?? []);
        if (change) {
          await tx.leadActivity.create({
            data: { leadId, userId, type: "ASSIGNEES_CHANGED", details: change },
          });
        }
      });
    }
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: data.leadIds } },
    include: leadListInclude,
  });
  return leads.map(serialiseLead);
}

// ----------------------------------------------------------------------- notes

export async function createNote(leadId: string, data: CreateNoteRequestSchema, userId: string) {
  const [note] = await prisma.$transaction([
    prisma.leadNote.create({
      data: { leadId, text: data.text, authorId: userId },
      include: { author: { select: { id: true, name: true, profilePhoto: true } } },
    }),
    prisma.leadActivity.create({ data: { leadId, userId, type: "NOTE_ADDED" } }),
    prisma.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } }),
  ]);
  return note;
}

export async function deleteNote(id: string) {
  return prisma.leadNote.delete({ where: { id } });
}

// ----------------------------------------------------------------------- tasks

export async function createTask(leadId: string, data: CreateTaskRequestSchema, userId: string) {
  const [task] = await prisma.$transaction([
    prisma.leadTask.create({
      data: {
        leadId,
        type: data.type,
        title: data.title,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        assigneeId: data.assigneeId ?? null,
      },
    }),
    prisma.leadActivity.create({
      data: { leadId, userId, type: "TASK_ADDED", details: { taskTitle: data.title } },
    }),
  ]);
  return task;
}

export async function updateTask(id: string, data: UpdateTaskRequestSchema, userId: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.leadTask.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.dueAt !== undefined && { dueAt: data.dueAt ? new Date(data.dueAt) : null }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.completed !== undefined && { completedAt: data.completed ? new Date() : null }),
      },
    });

    if (data.completed) {
      await tx.leadActivity.create({
        data: {
          leadId: task.leadId,
          userId,
          type: "TASK_COMPLETED",
          details: { taskTitle: task.title },
        },
      });
      await tx.lead.update({
        where: { id: task.leadId },
        data: { lastActivityAt: new Date() },
      });
    }

    return task;
  });
}

export async function deleteTask(id: string) {
  return prisma.leadTask.delete({ where: { id } });
}
