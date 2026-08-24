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
  stage: { select: { id: true, name: true, probability: true, rottingDays: true, status: true } },
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

export async function createLead(
  data: CreateLeadRequestSchema & {
    userId: string | null;
    automated?: boolean;
  },
) {
  const stage = await prisma.pipelineStage.findUniqueOrThrow({
    where: { id: data.stageId },
    select: { status: true },
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
        // A lead can be opened straight onto a closing column, so the stage's
        // own status decides rather than a default of OPEN.
        status: stage.status,
        closedAt: stage.status === "OPEN" ? null : new Date(),
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

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: data.userId,
        type: "CREATED",
        details: { sourceLabel: data.source, ...(data.automated && { automated: true }) },
      },
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
      select: { stageId: true, stage: { select: { name: true } } },
    });

    const target = await tx.pipelineStage.findUniqueOrThrow({
      where: { id: stageId },
      select: { name: true, status: true },
    });

    const now = new Date();
    const closing = target.status !== "OPEN";
    const lead = await tx.lead.update({
      where: { id },
      data: {
        stageId,
        stageEnteredAt: now,
        lastActivityAt: now,
        // The column decides: landing on a Won or Lost stage closes the lead,
        // and moving back to an open one reopens it.
        status: target.status,
        closedAt: closing ? now : null,
        closedById: closing ? userId : null,
        // A reason only belongs to a lead sitting in a Lost column. Dragging one
        // out — or straight across to Won — drops the reason with it.
        ...(target.status !== "LOST" && { lostReasonId: null }),
      },
      include: leadListInclude,
    });

    await tx.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: target.status === "OPEN" ? "MOVED" : target.status,
        details: { fromStageName: before.stage.name, toStageName: target.name },
      },
    });

    return serialiseLead(lead);
  });
}

export async function openLeadOnPipelineForContact({
  contactId,
  pipelineId,
  source,
  channel,
  userId = null,
}: {
  contactId: string;
  pipelineId: string;
  source: LeadSource;
  channel: LeadChannel;
  userId?: string | null;
}) {
  const existing = await prisma.lead.findFirst({
    where: { contactId, pipelineId },
    select: { id: true },
  });
  if (existing) return null;

  // The board's first open column — the entry point of its funnel. A board made
  // only of closing columns has nowhere to put a new lead.
  const stage = await prisma.pipelineStage.findFirst({
    where: { pipelineId, status: "OPEN" },
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

export async function closeLead(id: string, data: CloseLeadRequestSchema, userId: string) {
  return prisma.$transaction(async (tx) => {
    const isWon = data.status === "WON";
    const now = new Date();

    // Closing moves the lead into a column that closes it, so the board never
    // shows a won or lost lead sitting in an open column. `stageId` is the
    // column the user actually dropped on; without one, the board's first
    // column of that status stands in.
    const target = data.stageId
      ? await tx.pipelineStage.findFirst({
          where: { id: data.stageId, pipeline: { leads: { some: { id } } } },
          select: { id: true },
        })
      : await tx.pipelineStage.findFirst({
          where: { pipeline: { leads: { some: { id } } }, status: data.status },
          orderBy: { order: "asc" },
          select: { id: true },
        });

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
        // A board with no column of this status keeps the lead where it stalled
        // rather than losing it — closed is still recorded on the lead itself.
        ...(target && { stageId: target.id, stageEnteredAt: now }),
      },
      include: leadListInclude,
    });

    // A closed lead's open tasks are noise on someone's list.
    await tx.leadTask.updateMany({
      where: { leadId: id, completedAt: null },
      data: { completedAt: now },
    });

    await tx.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: data.status,
        details: {
          ...(reason && { lostReasonLabel: reason.label }),
          ...(data.note && { note: data.note }),
        },
      },
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
