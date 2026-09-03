import type { TaskRunner } from "./task.js";
import { convertAssignLifecycleActions } from "./tasks/convertAssignLifecycleActions.js";
import { convertSubscriptions } from "./tasks/convertSubscriptions.js";
import { deletePipelines } from "./tasks/deletePipelines.js";
import { mapLifecycleRefsToStages } from "./tasks/mapLifecycleRefsToStages.js";
import { placeLeadsFromLifecycles } from "./tasks/placeLeadsFromLifecycles.js";
import { refreshPlanFeatures } from "./tasks/refreshPlanFeatures.js";
import { relinkRazorpayPlans } from "./tasks/relinkRazorpayPlans.js";
import { removeCustomPlan } from "./tasks/removeCustomPlan.js";
import { repriceCatalogPlans } from "./tasks/repriceCatalogPlans.js";
import { restructureTiers } from "./tasks/restructureTiers.js";
import { retireLegacyPlans } from "./tasks/retireLegacyPlans.js";
import { seedConversationAddon } from "./tasks/seedConversationAddon.js";
import { seedPipelines } from "./tasks/seedPipelines.js";
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
    id: "reprice-catalog-plans",
    title: "Reprice the gateway plans",
    description:
      "Moves each tier's Razorpay plans (and Stripe prices) onto the catalog's current " +
      "amounts. Run this before “Seed the plan catalog” after a price change — seeding " +
      "refuses to reuse a plan whose amount has moved, so nothing else can push one " +
      "through. Neither gateway allows editing an amount, so a fresh plan is created and " +
      "the stored id repointed. Customers already subscribed keep their old price: their " +
      "subscription names the plan it was created against, and that plan is left alone. " +
      "Idempotent.",
    destructive: true,
    run: repriceCatalogPlans,
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
      "Free stays Free and is rewritten to today's Free numbers; every other plan becomes " +
      "Enterprise while KEEPING the counts it already runs on, written as a contracted cap " +
      "rather than made unlimited — so nobody gains volume nobody sold them, and nobody is " +
      "moved onto a price they did not agree to. Which tier an account really belongs on is " +
      "then a conversation. Every blob is rebuilt from the current presets, so retired keys " +
      "are dropped. Orgs whose subscription names no plan are adopted onto Enterprise too, " +
      "since an unplanned row is invisible to add-ons, expiry and the admin plan views. A " +
      "live Razorpay subscription is reported but never cancelled. A legacy free account " +
      "may lose allowance it was carrying — preview the run first. Rewrites live " +
      "entitlements: take a backup.",
    destructive: true,
    run: convertSubscriptions,
  },

  // ---- Lifecycle → pipeline migration -------------------------------------
  // Run in this order. Each one assumes the one above it has already been applied:
  // boards have to exist before leads can be placed on them, and columns have to exist
  // before a stored lifecycle reference can be resolved to one.
  {
    id: "delete-pipelines",
    title: "Delete every pipeline",
    description:
      "Wipes every board in every organisation, so the seeder can start from a clean " +
      "slate. Stages, leads, notes, activity, tasks, labels and lost reasons all cascade " +
      "with them, and teams have their default board cleared. Contacts and lifecycles are " +
      "untouched. Built for clearing boards created while the feature was being tested — " +
      "preview it first, because the counts it reports are what an apply run destroys.",
    destructive: true,
    run: deletePipelines,
  },
  {
    id: "seed-pipelines",
    title: "Seed a pipeline per organisation",
    description:
      "Gives every organisation that has none a “Default Pipeline”, with one column per " +
      "lifecycle stage it owns — same names, so contacts can then be placed on the column " +
      "matching the lifecycle they already sit in. Appends a Won or Lost column if the " +
      "org's lifecycles produce neither, since a board without one cannot close a lead. " +
      "Skips organisations that already have a board, have no lifecycles, or have no " +
      "teams. Idempotent.",
    destructive: false,
    run: seedPipelines,
  },
  {
    id: "place-leads-from-lifecycles",
    title: "Place leads from lifecycles",
    description:
      "Puts every classified contact on the board column matching its lifecycle, by name. " +
      "A contact whose lifecycle has no column of that name is reported rather than " +
      "dropped somewhere arbitrary, and a contact with no lifecycle stays off the board. " +
      "Lead dates come from the contact's last real activity, so a lead that has sat " +
      "untouched for months reads as stalled rather than fresh. Resumable and safe to " +
      "re-run — if it reports work remaining, run it again.",
    destructive: false,
    run: placeLeadsFromLifecycles,
  },
  {
    id: "map-lifecycle-refs-to-stages",
    title: "Map stored lifecycle references onto stages",
    description:
      "Writes a stage id next to every stored lifecycle id — Zoho Bigin and CRM mappings, " +
      "and Assign Lifecycle rule actions. Additive: both keys are kept, so live syncing " +
      "and live rules keep working while the code that reads them is still moving over. " +
      "Lifecycle conditions and lifecycle-triggered rules cannot be migrated by data alone " +
      "and are reported, not touched.",
    destructive: false,
    run: mapLifecycleRefsToStages,
  },
  {
    id: "convert-assign-lifecycle-actions",
    title: "Convert Assign Lifecycle rules to Assign Stage",
    description:
      "Switches automation rules that set a lifecycle over to moving the contact's lead " +
      "instead. This changes what those rules do: the old action fanned out to Zoho, " +
      "Zapier and the Meta Conversions API, and the new one writes only the lead, so a " +
      "converted rule stops updating Zoho until those surfaces move. The lifecycle it came " +
      "from is kept in the stored value so a rule can be put back by hand. An action whose " +
      "lifecycle has no column of that name is left alone and reported.",
    destructive: true,
    run: convertAssignLifecycleActions,
  },
];

export function findTask(id: string) {
  return MAINTENANCE_TASKS.find((task) => task.id === id);
}
