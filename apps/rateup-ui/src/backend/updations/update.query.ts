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
    onSuccess: (response: any) => {
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
