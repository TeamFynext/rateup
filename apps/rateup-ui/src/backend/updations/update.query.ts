// For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  migrateWaTemplateToWhatsappPhoneId,
  syncTeamFeatures,
  migrateLoyaltyTierPriority,
  seedInboxStats,
  reconcileInboxStatus,
  backfillConversations,
  migrateFreePlanFeatures,
  migrateNonFreePlanFeatures,
  deleteAllPipelines,
  seedPipelines,
  placeLeadsFromLifecycles,
  mapLifecycleRefsToStages,
  convertAssignLifecycleActions,
  type BackfillConversationsResult,
} from "./update.api";

export const useMigrateWaTemplateToWhatsappPhoneId = () => {
  return useMutation({
    mutationFn: migrateWaTemplateToWhatsappPhoneId,
    onSuccess: () => {
      toast.success("WA template migration completed successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate WA template to WhatsApp phone ID");
    },
  });
};

export const useSyncTeamFeatures = () => {
  return useMutation({
    mutationFn: syncTeamFeatures,
    onSuccess: () => {
      toast.success("Team features synced successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to sync team features");
    },
  });
};

export const useMigrateFreePlanFeatures = () => {
  return useMutation({
    mutationFn: migrateFreePlanFeatures,
    onSuccess: ({ data }) => {
      toast.success(data.message, {
        description: `${data.updated} free-plan subscription(s) updated.`,
        id: "migrate-free-plan-features",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate free plan features");
    },
  });
};

export const useMigrateNonFreePlanFeatures = () => {
  return useMutation({
    mutationFn: migrateNonFreePlanFeatures,
    onSuccess: ({ data }) => {
      toast.success(data.message, {
        description: `${data.updated} subscription(s) migrated, ${data.skipped} free plan(s) skipped.`,
        id: "migrate-non-free-plan-features",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate plan features");
    },
  });
};

export const useMigrateLoyaltyTierPriority = () => {
  return useMutation({
    mutationFn: migrateLoyaltyTierPriority,
    onSuccess: () => {
      toast.success("Loyalty tier priorities migrated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate loyalty tier priorities");
    },
  });
};

export const useSeedInboxStats = () => {
  return useMutation({
    mutationFn: seedInboxStats,
    onSuccess: (response) => {
      toast.success(response?.data || "Inbox stats seeded successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to seed inbox stats");
    },
  });
};

export const useReconcileInboxStatus = () => {
  return useMutation({
    mutationFn: (apply: boolean) => reconcileInboxStatus(apply),
    onSuccess: ({ data }) => {
      const detail = `Scanned ${data.scanned}, mismatched ${data.mismatched}, skipped ${data.skippedReopenPending} pending reopen.`;
      // A dry run wrote nothing, so it is an info toast rather than a success.
      const notify = data.applied ? toast.success : toast.info;
      notify(data.message, { description: detail, id: "reconcile-inbox-status" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to reconcile inbox status");
    },
  });
};

// Resumable: the API caps requests at 30s, so a full run takes several calls. The
// server returns `done: false` while work remains; this hook keeps calling until it is
// done, accumulating the per-batch counts and showing progress.
const BATCH_LIMIT = 200; // backstop so a bug on the server cannot spin forever

export const useBackfillConversations = () => {
  return useMutation({
    mutationFn: async (apply: boolean) => {
      const total = {
        scannedContacts: 0,
        conversationsCreated: 0,
        messagesLinked: 0,
        assigneesBackfilled: 0,
      };
      let batches = 0;
      let last: BackfillConversationsResult;

      do {
        const { data } = await backfillConversations(apply);
        last = data;
        batches++;
        total.scannedContacts += data.scannedContacts;
        total.conversationsCreated += data.conversationsCreated;
        total.messagesLinked += data.messagesLinked;
        total.assigneesBackfilled += data.assigneesBackfilled;

        if (apply && !data.done) {
          toast.loading(`Backfilling… ${total.conversationsCreated} conversation(s) created`, {
            id: "backfill-conversations",
          });
        }
      } while (apply && !last.done && batches < BATCH_LIMIT);

      return { ...total, applied: last.applied, done: last.done, batches };
    },
    onSuccess: (data) => {
      const detail =
        `${data.conversationsCreated} missing conversation(s), ${data.messagesLinked} message(s) linked, ` +
        `${data.assigneesBackfilled} assignee(s) copied.`;

      if (!data.applied) {
        toast.info(`Dry run: would create ${detail} Nothing was written.`, {
          id: "backfill-conversations",
        });
        return;
      }
      if (!data.done) {
        toast.warning(`Stopped after ${data.batches} batches with work remaining. ${detail}`, {
          id: "backfill-conversations",
        });
        return;
      }
      toast.success(`Backfill complete in ${data.batches} batch(es).`, {
        description: detail,
        id: "backfill-conversations",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to backfill conversations", {
        id: "backfill-conversations",
      });
    },
  });
};

/**
 * Wipes every pipeline in every org. The dry run reports what an apply would
 * destroy; the apply is not undoable, so the caller must confirm first.
 */
export const useDeleteAllPipelines = () => {
  return useMutation({
    mutationFn: (apply: boolean) => deleteAllPipelines(apply),
    onSuccess: ({ data }) => {
      const detail =
        `${data.pipelines} pipeline(s) · ${data.stages} stage(s) · ${data.leads} lead(s) ` +
        `across ${data.orgs} org(s)` +
        (data.teamsPointingAtOne ? `, ${data.teamsPointingAtOne} team pointer(s) cleared.` : ".");
      // A dry run wrote nothing, so it is an info toast rather than a success.
      const notify = data.applied ? toast.success : toast.info;
      notify(data.message, { description: detail, id: "delete-all-pipelines" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete pipelines", { id: "delete-all-pipelines" });
    },
  });
};

/**
 * Builds a "Default Pipeline" per org from that org's lifecycle stages. Safe to
 * re-run: an org that already has a board is skipped.
 */
export const useSeedPipelines = () => {
  return useMutation({
    mutationFn: (apply: boolean) => seedPipelines(apply),
    onSuccess: ({ data }) => {
      const appended = [
        data.wonColumnsAdded && `${data.wonColumnsAdded} Won`,
        data.lostColumnsAdded && `${data.lostColumnsAdded} Lost`,
      ].filter(Boolean);
      const detail =
        `${data.orgsScanned} org(s) scanned. Skipped: ${data.skippedHasPipeline} with a board, ` +
        `${data.skippedNoLifecycles} without lifecycles, ${data.skippedNoTeams} without teams.` +
        (appended.length ? ` Added a closing column for ${appended.join(" and ")} org(s).` : "");
      // A dry run wrote nothing, so it is an info toast rather than a success.
      const notify = data.applied ? toast.success : toast.info;
      notify(data.message, { description: detail, id: "seed-pipelines" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to seed pipelines", { id: "seed-pipelines" });
    },
  });
};

/**
 * Places every classified contact on its matching column. Resumable like the
 * conversation backfill: the server works to a time budget and reports
 * `done: false` while contacts remain, so this keeps calling and accumulates.
 */
export const usePlaceLeadsFromLifecycles = () => {
  return useMutation({
    mutationFn: async (apply: boolean) => {
      const total = {
        scanned: 0,
        placed: 0,
        alreadyOnBoard: 0,
        unmatchedLifecycle: 0,
        skippedNoPipeline: 0,
      };
      let batches = 0;
      let last;

      do {
        const { data } = await placeLeadsFromLifecycles(apply);
        last = data;
        batches++;
        total.scanned += data.scanned;
        total.placed += data.placed;
        total.alreadyOnBoard += data.alreadyOnBoard;
        total.unmatchedLifecycle += data.unmatchedLifecycle;
        total.skippedNoPipeline += data.skippedNoPipeline;

        if (!data.done) {
          toast.loading(`Placing leads... ${total.placed} placed`, { id: "place-leads" });
        }
      } while (!last.done && batches < BATCH_LIMIT);

      return { ...total, applied: last.applied, done: last.done, batches };
    },
    onSuccess: (data) => {
      // The skips are the interesting half: an unmatched lifecycle means a name
      // no column carries, which is a thing to go and look at.
      const detail =
        `${data.scanned} classified contact(s) scanned, ${data.alreadyOnBoard} already on a board, ` +
        `${data.unmatchedLifecycle} with no matching column, ${data.skippedNoPipeline} in orgs with no board.`;

      if (!data.applied) {
        toast.info(`Dry run: ${data.placed} lead(s) would be placed. Nothing was written.`, {
          description: detail,
          id: "place-leads",
        });
        return;
      }
      if (!data.done) {
        toast.warning(`Stopped after ${data.batches} batch(es) with contacts remaining.`, {
          description: detail,
          id: "place-leads",
        });
        return;
      }
      toast.success(`Placed ${data.placed} lead(s) in ${data.batches} batch(es).`, {
        description: detail,
        id: "place-leads",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to place leads", { id: "place-leads" });
    },
  });
};

/**
 * Resolves stored lifecycle ids to stage ids in the Zoho mappings and the
 * automation rules. Additive and safe to re-run.
 */
export const useMapLifecycleRefsToStages = () => {
  return useMutation({
    mutationFn: (apply: boolean) => mapLifecycleRefsToStages(apply),
    onSuccess: ({ data }) => {
      // The leftovers matter more than the successes: an unresolved reference is
      // a mapping that will stop working, and the two "needs work" counts are
      // things no data migration can fix.
      const leftovers = [
        data.unresolved && `${data.unresolved} unresolved`,
        data.ruleConditionsNeedingWork && `${data.ruleConditionsNeedingWork} rule condition(s)`,
        data.lifecycleTriggeredRules &&
          `${data.lifecycleTriggeredRules} lifecycle-triggered rule(s)`,
      ].filter(Boolean);

      // Rows configured through the current UI already name a column and carry no
      // lifecycle at all. Saying so keeps "0 mapped" from reading as a failure.
      const detail =
        `Zoho: ${data.biginMapped}/${data.biginMappings} Bigin, ${data.crmMapped}/${data.crmMappings} CRM. ` +
        `Rules: ${data.ruleActionsMapped}/${data.ruleActions} action(s).` +
        (data.alreadyMapped ? ` ${data.alreadyMapped} already mapped.` : "") +
        (leftovers.length ? ` Still needs attention: ${leftovers.join(", ")}.` : "");

      const notify = data.applied ? toast.success : toast.info;
      notify(data.message, { description: detail, id: "map-lifecycle-refs" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to map lifecycle references", {
        id: "map-lifecycle-refs",
      });
    },
  });
};

/** Switches Assign Lifecycle rule actions over to Assign Stage. */
export const useConvertAssignLifecycleActions = () => {
  return useMutation({
    mutationFn: (apply: boolean) => convertAssignLifecycleActions(apply),
    onSuccess: ({ data }) => {
      const leftovers = [
        data.unresolved && `${data.unresolved} with no matching column`,
        data.skippedNoBoard && `${data.skippedNoBoard} in orgs with no board`,
      ].filter(Boolean);

      const detail =
        (data.rules.length ? `Rules: ${data.rules.join(", ")}. ` : "") +
        (leftovers.length ? `Left alone: ${leftovers.join(", ")}.` : "");

      const notify = data.applied ? toast.success : toast.info;
      notify(data.message, { description: detail || undefined, id: "convert-assign-lifecycle" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to convert rule actions", {
        id: "convert-assign-lifecycle",
      });
    },
  });
};
