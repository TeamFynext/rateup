import type { TaskRunner } from "./task.js";
import { convertSubscriptions } from "./tasks/convertSubscriptions.js";
import { refreshPlanFeatures } from "./tasks/refreshPlanFeatures.js";
import { relinkRazorpayPlans } from "./tasks/relinkRazorpayPlans.js";
import { removeCustomPlan } from "./tasks/removeCustomPlan.js";
import { restructureTiers } from "./tasks/restructureTiers.js";
import { retireLegacyPlans } from "./tasks/retireLegacyPlans.js";
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
    id: "restructure-tiers",
    title: "Restructure to five tiers",
    description:
      "Moves a four-tier catalog (Free / Starter / Pro / Enterprise) to the five-tier ladder " +
      "(Free / Plus / Pro / Max / Enterprise). Renames in place so customers keep their price " +
      "and allowances, then creates the new middle Pro tier. Run once per environment.",
    destructive: true,
    run: restructureTiers,
  },
  {
    id: "refresh-plan-features",
    title: "Refresh plan limits",
    description:
      "Re-applies each tier's limits to the catalog and to every organisation already on " +
      "that tier. Changing a limit in code only affects future grants — existing customers " +
      "keep the allowance they were given until this runs. Replaces the whole feature blob, " +
      "so any per-organisation override is lost; preview it to see exactly whose allowance " +
      "moves and by how much.",
    destructive: true,
    run: refreshPlanFeatures,
  },
  {
    id: "relink-razorpay-plans",
    title: "Relink Razorpay plan ids",
    description:
      "Re-points stored plan ids at the Razorpay account the current API key belongs to. " +
      "Reach for this after switching keys, when checkout starts failing with " +
      "“The ID provided is invalid or could not be found”.",
    destructive: true,
    run: relinkRazorpayPlans,
  },
  {
    id: "retire-legacy-plans",
    title: "Retire legacy plans",
    description:
      "Disables every gateway plan no catalog tier sells, and deletes tiers outside the " +
      "catalog that nothing references. Gateway plans are only ever disabled — orders and " +
      "invoices still name them.",
    destructive: true,
    run: retireLegacyPlans,
  },
  {
    id: "remove-custom-plan",
    title: "Remove the `custom` tier",
    description:
      "Deletes the stray `custom` tier, which duplicated Enterprise. Refuses while any " +
      "subscription or order still points at it.",
    destructive: true,
    run: removeCustomPlan,
  },
  {
    id: "convert-subscriptions",
    title: "Convert subscriptions to the catalog",
    description:
      "Free stays Free; every other plan becomes Enterprise. Enterprise is unlimited and " +
      "invoiced on real usage, so nobody loses capability and nobody is moved onto a price " +
      "they did not agree to — which tier an account really belongs on is then a " +
      "conversation. Orgs whose subscription names no plan are adopted onto Enterprise too, " +
      "since an unplanned row is invisible to add-ons, expiry and the admin plan views. A " +
      "live Razorpay subscription is reported but never cancelled. Rewrites live " +
      "entitlements — take a backup first.",
    destructive: true,
    run: convertSubscriptions,
  },
];

export function findTask(id: string) {
  return MAINTENANCE_TASKS.find((task) => task.id === id);
}
