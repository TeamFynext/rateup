import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Wipes every pipeline in every org. Built for clearing the boards created while the
 * feature was being tested, before the real seeding runs.
 *
 * Deliberately blunt and deliberately total: there is no per-org filter, because the
 * point is to get back to a clean slate everywhere at once. Everything hanging off a
 * pipeline cascades with it — stages, leads, and with each lead its notes, activity
 * timeline, tasks, assignees and labels, plus the board's labels, lost reasons and team
 * memberships.
 *
 * `Team.defaultPipelineId` is `SetNull`, so teams survive with the pointer cleared;
 * `autoCreateLeads` is cleared alongside it so a team is not left opted into a board that
 * no longer exists.
 *
 * Contacts are untouched. So are lifecycles.
 *
 * Preview it first — the counts it reports are exactly what an apply run destroys.
 */
export async function deletePipelines({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const [pipelines, stages, leads, orgs, teamsPointingAtOne] = await Promise.all([
    prisma.pipeline.count(),
    prisma.pipelineStage.count(),
    prisma.lead.count(),
    prisma.pipeline.groupBy({ by: ["orgId"] }),
    prisma.team.count({ where: { defaultPipelineId: { not: null } } }),
  ]);

  const details = { pipelines, stages, leads, orgs: orgs.length, teamsPointingAtOne };

  if (!pipelines) {
    return { summary: "No pipelines exist — nothing to do.", details };
  }

  log(`${pipelines} pipeline(s) across ${orgs.length} org(s)`);
  log(`${stages} column(s) and ${leads} lead(s) cascade with them`);
  log(`${teamsPointingAtOne} team(s) would have their default board cleared`);

  if (!apply) {
    return {
      summary: `Would delete ${pipelines} pipeline(s) across ${orgs.length} org(s).`,
      details,
    };
  }

  await prisma.$transaction(async (tx) => {
    // Cleared before the delete rather than left to `SetNull`, so no team is left opted
    // into auto-creating leads on a board that has gone.
    await tx.team.updateMany({
      where: { defaultPipelineId: { not: null } },
      data: { defaultPipelineId: null, autoCreateLeads: false },
    });
    await tx.pipeline.deleteMany({});
  });

  log("deleted every pipeline in every org");
  return { summary: `Deleted ${pipelines} pipeline(s) across ${orgs.length} org(s).`, details };
}
