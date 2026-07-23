import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Building2,
  Calendar,
  CheckCircle,
  Globe,
  Info,
  LayoutTemplate,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Settings,
  Shield,
  Star,
  Trash,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";

import {
  useAllOrgs,
  useDeleteOrgByAdminMutation,
  useOrgStats,
  useSendDeleteOrgEmail,
  useUpdateOrgPause,
} from "@/backend/org/org.query";
import {
  useMessageStats,
  useSubscriptionByOrgId,
  useUpdateSubscriptionMutation,
} from "@/backend/subscription/subscription.query";
import { SubscriptionEditorModal } from "@/components/adminPanel/Subscription/SubscriptionEditorModal.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

export const Route = createFileRoute("/admin/orgs/$orgId/")({
  component: OrgById,
});

dayjs.extend(relativeTime);

function StatCard({ title, count, icon: Icon, color = "blue" }) {
  const getColorClasses = () => {
    switch (color) {
      case "green":
        return "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800";
      case "purple":
        return "from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800";
      case "amber":
        return "from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800";
      case "rose":
        return "from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800";
      default:
        return "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800";
    }
  };

  const getIconColor = () => {
    switch (color) {
      case "green":
        return "text-green-600";
      case "purple":
        return "text-purple-600";
      case "amber":
        return "text-amber-600";
      case "rose":
        return "text-rose-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <Card className={`relative overflow-hidden ${getColorClasses()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${getIconColor()}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getIconColor()}`}>{count || 0}</div>
      </CardContent>
    </Card>
  );
}

function StatSection({ title, children, icon: Icon }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

function OrgById() {
  const [opened, { close, open }] = useDisclosure(false);
  const [isAnnualMessageLimit, setIsAnnualMessageLimit] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const confirm = useConfirm();
  const params = useParams({
    strict: false,
  });
  const orgId = params?.orgId as string;
  const {
    data: subscription,
    isLoading: isSubLoading,
    isError: isSubErr,
  } = useSubscriptionByOrgId(orgId);
  const { data: orgs, isLoading: isOrgsLoading } = useAllOrgs();
  const { data: stats, isLoading, isError } = useOrgStats(orgId);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const updatePauseStatus = useUpdateOrgPause();
  const { t: translations } = useTranslation();
  const updateSubscription = useUpdateSubscriptionMutation();
  const sendDeletionEmail = useSendDeleteOrgEmail();

  useEffect(() => {
    if (orgs) {
      setOrgDetails(orgs.find((org) => org.id === orgId));
    }
  }, [orgs]);

  const handleOrgPauseStatus = () => {
    updatePauseStatus.mutate({
      orgId,
      data: { isPaused: !orgDetails?.isPaused },
    });
  };

  const handlePauseResumeClick = async () => {
    const shouldProceed = await confirm({
      title: orgDetails?.isPaused
        ? translations("Resume Organization")
        : translations("Pause Organization"),
      description: `Are you sure to ${orgDetails?.isPaused ? "resume" : "pause"} this organization?`,
      confirmText: translations("Yes"),
      cancelText: translations("cancel"),
    });

    if (!shouldProceed) return;

    handleOrgPauseStatus();
  };

  const handleAnnualMessageLimit = (checked: boolean) => {
    updateSubscription.mutate(
      { orgId, updatedData: { isAnnualMessageLimit: checked } },
      {
        onSuccess: () => {
          setIsAnnualMessageLimit(checked);
        },
      },
    );
  };

  useEffect(() => {
    if (subscription) setIsAnnualMessageLimit(subscription.isAnnualMessageLimit);
  }, [subscription]);

  const [ranges, setRange] = useState<Range[]>([
    {
      key: "selection",
    },
  ]);
  const {
    data: messageStats,
    isLoading: isMessageStatsLoading,
    error: messageError,
  } = useMessageStats(orgId, {
    dateRange:
      !ranges.length || !ranges[0].startDate || !ranges[0].endDate
        ? []
        : [ranges[0]?.startDate.toISOString(), ranges[0]?.endDate.toISOString()],
  });

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selction" }]);
    }
  }, [ranges]);

  if (isError || isSubErr) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading organization data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading || isOrgsLoading || !stats || isSubLoading)
    return <RateupLoader className="h-dvh" />;

  const lastActivity = orgDetails?.AuditLog?.[0]?.createdAt;
  const last = lastActivity ? dayjs(lastActivity) : null;
  const isInactive = last?.isBefore(dayjs().subtract(6, "month"));

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">{stats.name}</h1>
              {orgDetails?.isPaused && <Badge variant="destructive">Paused</Badge>}
            </div>
            <RefreshButton queryKeys={["org", "stats"]} />
            <div className="flex flex-col leading-tight">
              {last ? (
                <>
                  <span
                    className={`text-sm font-medium ${
                      isInactive ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {isInactive ? "Inactive" : "Active"}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {isInactive ? `Inactive for ${last.fromNow(true)}` : `Active ${last.fromNow()}`}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {formatIsoDateStringWithTime(lastActivity)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">No activity</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Annual Message Limit Toggle */}
            {(!subscription?.basePlan?.paymentPlan ||
              subscription?.basePlan?.paymentPlan?.period === "yearly") && (
              <div className="flex items-center gap-2">
                <Switch
                  id="annual-limit"
                  checked={isAnnualMessageLimit}
                  onCheckedChange={handleAnnualMessageLimit}
                />
                <Label htmlFor="annual-limit" className="text-sm">
                  Annual Message Limit
                </Label>
                {subscription?.basePlan?.paymentPlan && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Updation will affect only in current subscription year</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <Button variant="outline" onClick={open}>
              <Settings className="h-4 w-4 mr-2" />
              {translations("Manage Subscription")}
            </Button>

            {orgDetails?.id !== import.meta.env.VITE_ROOT_ORG && (
              <Button
                variant={orgDetails?.isPaused ? "default" : "destructive"}
                onClick={handlePauseResumeClick}
              >
                {orgDetails?.isPaused ? (
                  <Play className="h-4 w-4 mr-2" />
                ) : (
                  <Pause className="h-4 w-4 mr-2" />
                )}
                {orgDetails?.isPaused
                  ? translations("Resume Organization")
                  : translations("Pause Organization")}
              </Button>
            )}
            <Button variant="destructive" onClick={() => setOpenDeleteModal(true)}>
              <Info />
              Delete Options
            </Button>
          </div>
        </div>
      </div>
      {/* Stats Sections */}
      <div className="space-y-8">
        {/* Organization Stats */}
        <StatSection title="Organization" icon={Building2}>
          <StatCard title="Staff" count={stats.members} icon={Users} color="blue" />
          <StatCard title="Invitations" count={stats.invitations} icon={Calendar} color="amber" />
        </StatSection>

        {/* Teams Stats */}
        <StatSection title={translations("Teams")} icon={Users}>
          <StatCard title="Total Teams" count={stats.teams.total} icon={Users} color="purple" />
          <StatCard title="Team Staff" count={stats.teams.members} icon={Users} color="blue" />
          <StatCard
            title="Team Invitations"
            count={stats.teams.invitations}
            icon={Calendar}
            color="amber"
          />
        </StatSection>

        {/* Web Surveys Stats */}
        <StatSection title={translations("Web Surveys")} icon={Globe}>
          <StatCard title="Surveys" count={stats.web.surveys} icon={Globe} color="green" />
          <StatCard title="Responses" count={stats.web.responses} icon={Star} color="blue" />
          <StatCard title="Visited" count={stats.web.visited} icon={Users} color="purple" />
        </StatSection>

        {/* WhatsApp Surveys Stats */}
        <StatSection title={translations("WhatsApp Surveys")} icon={MessageSquare}>
          <StatCard
            title="Surveys"
            count={stats.whatsapp.surveys}
            icon={MessageSquare}
            color="green"
          />
          <StatCard title="Responses" count={stats.whatsapp.responses} icon={Star} color="blue" />
          <StatCard
            title="Templates"
            count={stats.whatsapp.templates}
            icon={Settings}
            color="purple"
          />
          <StatCard title="Visited" count={stats.whatsapp.visited} icon={Users} color="amber" />
        </StatSection>

        {/* Reputation Management Stats */}
        <StatSection title={translations("Reputation Mangement")} icon={Star}>
          <StatCard title="Reviews" count={stats.rm.reviews} icon={Star} color="rose" />
          <StatCard
            title="Analyzed Reviews"
            count={stats.rm.analyzedReviews}
            icon={Shield}
            color="blue"
          />
        </StatSection>

        {/* Campaigns Stats */}
        <StatSection title={translations("Campaigns")} icon={Zap}>
          <StatCard title="Campaigns" count={stats.campaigns.campaigns} icon={Zap} color="purple" />
          <StatCard
            title="Participants"
            count={stats.campaigns.participants}
            icon={Users}
            color="green"
          />
        </StatSection>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold tracking-tight">Template Message Count</h3>
          <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isMessageStatsLoading ? (
            <Spinner />
          ) : messageError ? (
            <p>Error getting message stats</p>
          ) : (
            <StatCard
              title="Template Messages Sent"
              count={messageStats?.count}
              icon={LayoutTemplate}
              color="green"
            />
          )}
        </div>
      </div>
      {/* Modals */}
      {subscription && (
        <SubscriptionEditorModal subscription={subscription} opened={opened} onClose={close} />
      )}
      <DeleteOrgModal
        open={openDeleteModal}
        deletionMailSent={orgDetails?.deletionMailSent}
        onClose={() => setOpenDeleteModal(false)}
        orgId={orgId}
        isSendingEmail={sendDeletionEmail.isPending}
        onSendEmail={(orgId, onDone) => {
          sendDeletionEmail.mutate(orgId, {
            onSuccess: () => {
              onDone?.();
            },
          });
        }}
      />
    </div>
  );
}

interface DeleteOrgModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  isInactive?: boolean;
  isSendingEmail?: boolean;
  onSendEmail: (orgId: string, onDone?: () => void) => void;
  deletionMailSent: string | null;
}

function DeleteOrgModal({
  open,
  onClose,
  orgId,
  isSendingEmail,
  onSendEmail,
  deletionMailSent,
}: DeleteOrgModalProps) {
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const deleteOrg = useDeleteOrgByAdminMutation();
  const navigate = useNavigate();

  // countdown logic
  useEffect(() => {
    if (!openConfirmDelete) return;

    setCountdown(5);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [openConfirmDelete]);

  if (!open) return null;

  return (
    <>
      {/* 🔹 First Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-[420px] space-y-5 shadow-lg">
          <div>
            <h2 className="text-lg font-semibold">Delete Organization</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You can notify the organization before deleting or delete immediately.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Send Email */}
            <Button
              variant="outline"
              disabled={isSendingEmail}
              onClick={() => {
                onSendEmail(orgId, () => {
                  onClose();
                });
              }}
              className="relative"
            >
              <Mail />
              {isSendingEmail ? "Sending Mail..." : "Send Warning Email"}

              {/* ✅ Green Tick */}
              {deletionMailSent && (
                <CheckCircle className="h-4 w-4 text-green-500 absolute top-1 right-1" />
              )}
            </Button>

            {/* Delete Org → opens second modal */}
            <Button variant="destructive" onClick={() => setOpenConfirmDelete(true)}>
              <Trash />
              Delete Organization
            </Button>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
      {/* 🔴 Second Confirmation Modal */}
      {openConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-[420px] space-y-5 shadow-lg">
            <div>
              <h2 className="text-lg font-semibold text-destructive">Confirm Deletion</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This action is irreversible. Are you sure you want to delete this organization?
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpenConfirmDelete(false)}>
                Cancel
              </Button>

              <Button
                variant="destructive"
                disabled={countdown > 0 || deleteOrg.isPending}
                onClick={() => {
                  deleteOrg.mutate(orgId, {
                    onSuccess: () => {
                      setOpenConfirmDelete(false);
                      onClose();
                      navigate({
                        to: "/admin/orgs",
                      });
                    },
                  });
                }}
              >
                {deleteOrg.isPending
                  ? "Deleting..."
                  : countdown > 0
                    ? `Delete (${countdown}s)`
                    : "Delete Org"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
