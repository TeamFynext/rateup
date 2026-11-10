import prisma from "../../../../utils/prisma.js";
import { scanForDuplicates } from "../../../contacts/merge/suggestions.service.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Raises merge suggestions for duplicates that existed before suggestions did: contacts
 * sharing an email, and webchat visitors who typed another contact's phone or email. Never
 * merges; dismissed pairs stay dismissed. Safe to re-run.
 */
export async function findDuplicateContacts({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const before = await prisma.contactMergeSuggestion.count({ where: { status: "PENDING" } });
  if (!apply) {
    return {
      summary: `${before} suggestions are pending now. Apply to scan every organisation for more.`,
      details: { pendingBefore: before },
    };
  }
  const { pairs } = await scanForDuplicates(null);
  const after = await prisma.contactMergeSuggestion.count({ where: { status: "PENDING" } });
  log(`${pairs} likely duplicate pairs checked`);
  return {
    summary: `${after - before} new suggestions raised (${pairs} pairs checked, ${after} pending in all).`,
    details: { pairs, pendingBefore: before, pendingAfter: after },
  };
}
