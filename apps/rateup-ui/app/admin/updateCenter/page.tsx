"use client";

import {
  AlertTriangle,
  Database,
  RefreshCw,
  Settings,
  Shield,
  Users,
  Zap,
} from "lucide-react";

import {
  useAutomationSubscription,
  useUpdateAutomationPhoneId,
  useUpdateAutomationTriggerSubscription,
  useUpdateAutomationUsageStats,
  useUpdateBackfillMessageData,
  useUpdateCustomField,
  useUpdateFreePlanSubscriptionExpiry,
  useUpdateLifecycle,
  useUpdateSubscriptionNewFeat,
  useUpdateUsageStats,
} from "@/backend/updations/update.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isProduction } from "@/utils/constants";

function UpdateAllThemes() {
  const updateStats = useUpdateUsageStats();
  const { mutate } = useAutomationSubscription();
  const updateAutomTr = useUpdateAutomationTriggerSubscription();
  const updateAutStat = useUpdateAutomationUsageStats();
  const updateFeat = useUpdateSubscriptionNewFeat();
  const updateFreePlan = useUpdateFreePlanSubscriptionExpiry();
  const updateLife = useUpdateLifecycle();
  const updateCustom = useUpdateCustomField();
  const updatePhoneId = useUpdateAutomationPhoneId();
  const updateBackfill = useUpdateBackfillMessageData();

  const UpdateCard = ({
    title,
    description,
    onUpdate,
    loading,
    icon: Icon,
    variant = "default",
    disabled = false,
  }: {
    title: string;
    description: string;
    onUpdate: () => void;
    loading: boolean;
    icon: any;
    variant?: "default" | "warning" | "success";
    disabled?: boolean;
  }) => {
    const getCardClass = () => {
      switch (variant) {
        case "warning":
          return "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20";
        case "success":
          return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20";
        default:
          return "";
      }
    };

    const getIconColor = () => {
      switch (variant) {
        case "warning":
          return "text-amber-600";
        case "success":
          return "text-green-600";
        default:
          return "text-blue-600";
      }
    };

    return (
      <Card className={`relative overflow-hidden ${getCardClass()}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-white/50 dark:bg-gray-900/20`}>
              <Icon className={`h-5 w-5 ${getIconColor()}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={onUpdate}
            disabled={loading || disabled}
            className="w-full"
            variant={disabled ? "secondary" : "default"}
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Update Center
            </h1>
          </div>
          {isProduction && (
            <Badge variant="destructive" className="text-xs">
              Production Environment
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Manage system updates and data migrations
        </p>
      </div>

      {/* Warning Alert */}
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong>Warning:</strong> These operations can modify system data.
          Ensure you have proper backups before proceeding. Some operations are
          disabled in production environments for safety.
        </AlertDescription>
      </Alert>

      {/* Stats Updates Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5" />
          Statistics Updates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UpdateCard
            title="Update Template Message Count"
            description="Updates template message count in usage statistics"
            onUpdate={() => updateStats.mutate()}
            loading={updateStats.isPending}
            icon={Database}
            variant="success"
          />

          {!isProduction && (
            <UpdateCard
              title="Update Automation Usage Stats"
              description="Updates automation count in usage statistics"
              onUpdate={() => updateAutStat.mutate()}
              loading={updateAutStat.isPending}
              icon={Zap}
            />
          )}
        </div>
      </div>

      {/* Subscription Updates Section */}
      {!isProduction && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscription Updates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UpdateCard
              title="Update Automation Subscription"
              description="Adds automation to subscription for all users"
              onUpdate={() => mutate()}
              loading={updateStats.isPending}
              icon={Users}
              variant="warning"
            />

            <UpdateCard
              title="Update Automation Trigger Subscription"
              description="Adds automation triggers to subscriptions and rate-up plans"
              onUpdate={() => updateAutomTr.mutate()}
              loading={updateAutomTr.isPending}
              icon={Zap}
              variant="warning"
            />

            <UpdateCard
              title="Update Subscription Features"
              description="Adds webhooks, lead automation, and carousel templates to subscription features"
              onUpdate={() => updateFeat.mutate()}
              loading={updateFeat.isPending}
              icon={Settings}
              variant="warning"
            />
          </div>
        </div>
      )}

      {/* System Maintenance Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-5 w-5" />
          System Maintenance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UpdateCard
            title="Update Free Plan Expiry"
            description="Updates all free plan subscription expiry dates to 100 years ahead"
            onUpdate={() => updateFreePlan.mutate()}
            loading={updateFreePlan.isPending}
            icon={Shield}
            variant="success"
          />

          <UpdateCard
            title="Update Lifecycle"
            description="Adds default lifecycle configuration"
            onUpdate={() => updateLife.mutate()}
            loading={updateLife.isPending}
            icon={RefreshCw}
          />
        </div>
      </div>

      {/* Data Migration Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Migrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UpdateCard
            title="Migrate Tags to Custom Fields"
            description="Migrates existing tags to custom field structure"
            onUpdate={() => updateCustom.mutate()}
            loading={updateCustom.isPending}
            icon={Database}
            variant="warning"
          />

          <UpdateCard
            title="Migrate Automation Phone IDs"
            description="Migrates automation phoneId to phoneIds structure"
            onUpdate={() => updatePhoneId.mutate()}
            loading={updatePhoneId.isPending}
            icon={Database}
            variant="warning"
          />

          <UpdateCard
            title="Backfill Message Data"
            description="Backfills message data to contact records"
            onUpdate={() => updateBackfill.mutate()}
            loading={updateBackfill.isPending}
            icon={Database}
            variant="warning"
          />
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
              {isProduction
                ? "Limited operations available"
                : "All operations available"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UpdateAllThemes;
