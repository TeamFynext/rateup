import type { TaskRunner } from "./task.js";
import { purgeOrphanedCampaignJobs } from "./tasks/purgeOrphanedCampaignJobs.js";
import { restoreSentCampaignsFromDraft } from "./tasks/restoreSentCampaignsFromDraft.js";
import { seedConversationAddon } from "./tasks/seedConversationAddon.js";
import { seedPlans } from "./tasks/seedPlans.js";

export interface TaskDefinition {
  id: string;
  title: string;
  /** What it does and when you would reach for it, in the admin panel's own words. */
  description: string;
  /**
   * True when applying is hard to walk back — a delete, or a write to a payment gateway.
   * The panel makes the operator confirm these; it changes nothing about the task itself.
   */
  destructive: boolean;
  run: TaskRunner;
}

/**
 * Every maintenance task the admin panel can run.
 *
 * This replaced a module of one-off migration handlers that had accumulated behind
 * twenty-one **unauthenticated** routes under `/api/public/update` — anyone who knew a
 * path could rewrite plan features or retag every contact. Tasks now live behind the
 * same root-org gate as the rest of the admin surface.
 *
 * Adding a task is one entry here plus a file under `tasks/`; the panel reads this list,
 * so nothing on the frontend needs to change.
 *
 * The list is short because a finished migration is deleted rather than kept as a record
 * of having run — the tier and Razorpay migrations and the lifecycle-to-pipeline
 * conversion all lived here, have all been applied, and are in git if one is ever needed
 * again.
 *
 * The two seeders stay. They are not migrations: they are how an environment that has no
 * plan catalog gets one, so they are still ahead of any environment built from here, not
 * behind it. Both are idempotent and safe to re-run against a set-up environment.
 */
export const MAINTENANCE_TASKS: TaskDefinition[] = [
  {
    id: "seed-plans",
    title: "Seed the plan catalog",
    description:
      "Creates the tier rows and their Razorpay plans if they are missing. Idempotent — " +
      "existing tiers are left alone, so it is safe on an environment that is already set up. " +
      "Stripe products are never created from here: a live product cannot be deleted once a " +
      "subscription attaches to it.",
    destructive: true,
    run: seedPlans,
  },
  {
    id: "seed-conversation-addon",
    title: "Seed the conversation pack",
    description:
      "Creates the add-on that sells 5,000 extra conversations for one month " +
      "(₹1,200 / $19). Packs are bought outright and stack; nothing renews them. Also " +
      "unlinks the gateway plans from when packs were a subscription. Idempotent.",
    destructive: true,
    run: seedConversationAddon,
  },
  {
    id: "purge-orphaned-campaign-jobs",
    title: "Purge queued messages from deleted campaigns",
    description:
      "Removes scheduled WhatsApp messages whose campaign has been deleted. Deleting a " +
      "campaign used to leave its delayed jobs armed — each carries its own phone number, " +
      "template and token, so they still fired and Meta still delivered them. Delete " +
      "cancels its own queue now; this clears the ones stranded before it did, which " +
      "nothing else can reach. Preview first: the counts it reports are exactly what an " +
      "apply run removes. Messages already sending are left alone — they cannot be recalled.",
    destructive: true,
    run: purgeOrphanedCampaignJobs,
  },
  {
    id: "restore-sent-campaigns-from-draft",
    title: "Restore sent campaigns that read as drafts",
    description:
      "Puts back campaigns that were sent but now show as Draft. The migration that " +
      "introduced Draft decided a campaign had never launched from its startedAt and " +
      "campaignSentAt stamps, and a campaign sent with the Send now button had neither — " +
      "so a sent campaign that was later paused was reclassified as never started. This " +
      "finds them by their delivery record instead, which is intact, and moves them to " +
      "Completed (drip campaigns to Paused). A campaign that genuinely never sent has no " +
      "delivery record and is left alone. Preview first.",
    destructive: true,
    run: restoreSentCampaignsFromDraft,
  },
];

export function findTask(id: string) {
  return MAINTENANCE_TASKS.find((task) => task.id === id);
}
