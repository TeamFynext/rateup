import type { TaskRunner } from "./task.js";
import { migrateShopifyAbandonedCheckouts } from "./tasks/migrateShopifyAbandonedCheckouts.js";
import { purgeOrphanedCampaignJobs } from "./tasks/purgeOrphanedCampaignJobs.js";
import { restoreSentCampaignsFromDraft } from "./tasks/restoreSentCampaignsFromDraft.js";
import {
  migrateActiveContactPricing,
  repriceSubscriptions,
} from "./tasks/migrateActiveContactPricing.js";
import { seedAddons } from "./tasks/seedAddons.js";
import { seedPlans } from "./tasks/seedPlans.js";
import { backfillOrgModules } from "./tasks/backfillOrgModules.js";

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
    id: "seed-addons",
    title: "Seed the add-on packs",
    description:
      "Creates the active contact pack (1,000 contacts for 30 days, ₹999 / $19) and the " +
      "campaign credit pack (10,000 credits for 90 days, ₹499 / $10), renaming the old " +
      "conversation pack into the contact pack so packs already sold keep counting. Packs " +
      "are bought outright and stack; nothing renews them. Idempotent.",
    destructive: true,
    run: seedAddons,
  },
  {
    id: "migrate-active-contact-pricing",
    title: "Move orgs to active-contact pricing",
    description:
      "Run after Seed the plan catalog and Seed the add-on packs. Replaces each org's " +
      "conversation allowance with its tier's active-contact and campaign-credit allowances, " +
      "and backfills this month's active contacts and campaign sends so the new limits apply " +
      "immediately. Lists contracted Enterprise orgs, whose caps staff set by hand. Idempotent.",
    destructive: false,
    run: migrateActiveContactPricing,
  },
  {
    id: "reprice-subscriptions",
    title: "Move subscriptions to the new prices",
    description:
      "Moves every live Razorpay and Stripe subscription onto its tier's new price from its " +
      "next billing cycle, keeping currency and cadence. Shopify orgs are listed: they keep " +
      "the old price until they approve a new charge. Writes to the payment gateways.",
    destructive: true,
    run: repriceSubscriptions,
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
  {
    id: "migrate-shopify-abandoned-checkouts",
    title: "Move Shopify stores to webhook cart reminders",
    description:
      "Subscribes every connected Shopify store to the checkout webhooks that abandoned-cart " +
      "reminders now run on, and turns each store's old abandoned-cart template setting into " +
      'an "On abandoned checkouts" automation rule (plus a follow-up rule if it repeated), ' +
      "then switches the old setting off. Run it once, right after the API that handles " +
      "checkout webhooks is live; until then a store with the old setting sends no cart " +
      "reminders. Safe to re-run. Preview lists each store's missing topics and the rules " +
      "it would create.",
    destructive: false,
    run: migrateShopifyAbandonedCheckouts,
  },
  {
    id: "backfill-org-modules",
    title: "Choose each org's visible features",
    description:
      "For every org that has never chosen its features, keeps Loyalty, Commerce, Web " +
      "Forms, QR & Links and Meta AI Agent visible only where the org already has data in " +
      "them, and hides the rest from its navigation. Nothing is disabled — an admin turns a " +
      "feature back on from Features in the menu. Orgs that have already chosen are skipped, so " +
      "it is safe to re-run.",
    destructive: false,
    run: backfillOrgModules,
  },
];

export function findTask(id: string) {
  return MAINTENANCE_TASKS.find((task) => task.id === id);
}
