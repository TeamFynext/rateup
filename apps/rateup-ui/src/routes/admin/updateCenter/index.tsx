import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Database, RefreshCw, Settings, Shield } from "lucide-react";

import {
  useMigrateLoyaltyTierPriority,
  useMigrateWaTemplateToWhatsappPhoneId,
  useSyncTeamFeatures,
  useSeedInboxStats,
  useReconcileInboxStatus,
  useBackfillConversations,
} from "@/backend/updations/update.query";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { isProduction } from "@/utils/constants.ts";

export const Route = createFileRoute("/admin/updateCenter/")({
  component: UpdateAllThemes,
});

function UpdateAllThemes() {
  const migrateWaTemplate = useMigrateWaTemplateToWhatsappPhoneId();
  const syncTeamFeaturesMutation = useSyncTeamFeatures();
  const migrateLoyaltyTierPriorityMutation = useMigrateLoyaltyTierPriority();
  const seedInboxStatsMutation = useSeedInboxStats();
  const reconcileInboxStatusMutation = useReconcileInboxStatus();
  const backfillConversationsMutation = useBackfillConversations();
  const confirm = useConfirm();

  // The dry run is safe to fire directly; applying rewrites conversation rows.
  const handleReconcileApply = async () => {
    const shouldApply = await confirm({
      title: "Apply inbox status repairs",
      description:
        "This rewrites Conversation.status to match each contact's inbox status. Run the dry run first and confirm the mismatch count looks right. This cannot be undone.",
    });
    if (shouldApply) reconcileInboxStatusMutation.mutate(true);
  };

  const handleBackfillApply = async () => {
    const shouldApply = await confirm({
      title: "Apply conversation backfill",
      description:
        "This creates the MISSING conversations only: inbox contacts who have messages but no conversation at all. Contacts who already have a conversation are skipped entirely and nothing existing is modified. It runs in batches and can take several minutes. Run the dry run first and confirm the count looks right. This cannot be undone.",
    });
    if (shouldApply) backfillConversationsMutation.mutate(true);
  };

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Update Center</h1>
          </div>
          {isProduction && (
            <Badge variant="destructive" className="text-xs">
              Production Environment
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Run the WhatsApp template phone ID migration
        </p>
      </div>

      {/* Warning Alert */}
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong>Warning:</strong> These operations can modify system data. Ensure you have proper
          backups before proceeding.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Migration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    Migrate WA Template to WhatsApp Phone ID
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Runs the PUT migration for migrate-wa-template-to-whatsapp-phone-id
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => migrateWaTemplate.mutate()}
                disabled={migrateWaTemplate.isPending}
                className="w-full"
              >
                {migrateWaTemplate.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Migration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Sync Team Features</CardTitle>
                  <CardDescription className="mt-1">
                    Syncs team feature access for all organisations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => syncTeamFeaturesMutation.mutate()}
                disabled={syncTeamFeaturesMutation.isPending}
                className="w-full"
              >
                {syncTeamFeaturesMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Sync
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Migrate Loyalty Tier Priority</CardTitle>
                  <CardDescription className="mt-1">
                    Reassigns tier priorities in ascending order (0, 1, 2…) based on threshold for
                    all loyalty programs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => migrateLoyaltyTierPriorityMutation.mutate()}
                disabled={migrateLoyaltyTierPriorityMutation.isPending}
                className="w-full"
              >
                {migrateLoyaltyTierPriorityMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Migration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Seed Inbox Stats</CardTitle>
                  <CardDescription className="mt-1">
                    Calculates and seeds Inbox Stats for all organisations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => seedInboxStatsMutation.mutate()}
                disabled={seedInboxStatsMutation.isPending}
                className="w-full"
              >
                {seedInboxStatsMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Seeding
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Reconcile Inbox Status</CardTitle>
                  <CardDescription className="mt-1">
                    Realigns each contact&apos;s latest Conversation.status with the contact&apos;s
                    inbox status. Dry run reports the mismatches without writing.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => reconcileInboxStatusMutation.mutate(false)}
                  disabled={reconcileInboxStatusMutation.isPending}
                  className="flex-1"
                >
                  {reconcileInboxStatusMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Dry Run
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReconcileApply}
                  disabled={reconcileInboxStatusMutation.isPending}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Apply Repairs
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/50 p-2 dark:bg-gray-900/20">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Backfill Missing Conversations</CardTitle>
                  <CardDescription className="mt-1">
                    Creates conversations only for inbox contacts who have messages but no
                    conversation at all, links those messages, and copies their inbox assignees.
                    Contacts who already have a conversation are skipped and nothing existing is
                    modified. Dry run reports the count without writing.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => backfillConversationsMutation.mutate(false)}
                  disabled={backfillConversationsMutation.isPending}
                  className="flex-1"
                >
                  {backfillConversationsMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Dry Run
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleBackfillApply}
                  disabled={backfillConversationsMutation.isPending}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Apply Backfill
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Environment Info */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              Environment Information
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <strong>Current Environment:</strong>{" "}
              <Badge variant={isProduction ? "destructive" : "secondary"}>
                {isProduction ? "Production" : "Development"}
              </Badge>
            </div>
            <div>
              <strong>Restrictions:</strong>{" "}
              {isProduction ? "Limited operations available" : "All operations available"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
