// Extracted verbatim from the `/admin/subscriptions/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconBuilding,
  IconCalendar,
  IconCreditCard,
  IconPackage,
  IconStar,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import { useRateupPaymentsPlans } from "@/backend/payment/payment.query";
import {
  useAllSubscriptions,
  useUpdateSubscriptionMutation,
} from "@/backend/subscription/subscription.query";
import { DataTableToolbar } from "@/components/admin/subscriptions/data-table-toolbar.tsx";
import { FeatureBadge } from "@/components/adminPanel/Subscription/FeatureBadge.tsx";
import { SubscriptionEditorModal } from "@/components/adminPanel/Subscription/SubscriptionEditorModal.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { pressable } from "@/components/common/pressable.ts";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import type { SubscriptionFeaturePathName } from "@/types/enums.ts";

interface SubscriptionTableData {
  id: string;
  orgId: string;
  orgName: string;
  planId: string;
  planName: string;
  features: Subscription;
  createdAt: string;
  renewedAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export function SubscriptionPage() {
  const {
    data: subscriptions,
    isLoading: isSubscriptionsLoading,
    isError: isSubscriptionsError,
  } = useAllSubscriptions();
  const { t: translations } = useTranslation();
  const { data: rateupPlans } = useRateupPaymentsPlans();
  const updateSubscriptionMutation = useUpdateSubscriptionMutation();

  const confirm = useConfirm();

  const columns: ColumnDef<DataTableFeatures, SubscriptionTableData>[] = [
    {
      accessorKey: "orgId",
      header: "Org ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">{row.getValue("orgId")}</div>
      ),
      meta: { title: "Org ID" },
    },
    {
      accessorKey: "orgName",
      header: createSortableHeader("Organization"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconBuilding className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("orgName")}</span>
        </div>
      ),
      meta: { title: "Organization" },
    },
    {
      accessorKey: "planName",
      header: createSortableHeader("Plan"),
      cell: ({ row }) => {
        const planName = row.getValue("planName");
        return (
          <Select
            value={row.original.planId}
            items={
              rateupPlans?.map((plan: RateupPaymentPlan) => ({
                value: plan.id,
                label: plan.name,
              })) ?? []
            }
            onValueChange={async (value) => {
              const shouldUpdate = await confirm({
                title: translations("Update Plan"),
                description: translations("Are you sure to update plan?"),
                confirmText: translations("Yes"),
                cancelText: translations("Cancel"),
              });

              if (!shouldUpdate) return;

              updateSubscriptionMutation.mutate({
                orgId: row.original.orgId,
                updatedData: {
                  basePlanId: value,
                  renewedAt: new Date(),
                },
              });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <IconPackage className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="font-medium">
                    {String(planName ?? "")}
                  </Badge>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rateupPlans?.map((plan: RateupPaymentPlan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      meta: { title: "Plan" },
    },
    {
      accessorKey: "features",
      header: "Features",
      cell: ({ row }) => {
        const subscription = row.original.features;
        const features = subscription.features;
        const [opened, { open, close }] = useDisclosure(false);

        // Tickets/menu are no longer subscription-managed; hide them from the badges too.
        const HIDDEN_FEATURES = ["menu", "ticket"];
        const activeFeatures = features
          ? Object.entries(features)
              .filter(
                ([feature, value]) =>
                  (value as { active?: boolean } | undefined)?.active &&
                  !HIDDEN_FEATURES.includes(feature),
              )
              .map(([feature]) => feature)
          : [];

        return (
          <>
            <div className="flex flex-wrap gap-1 max-w-[300px] cursor-pointer" {...pressable(open)}>
              {activeFeatures.slice(0, 3).map((feature) => (
                <FeatureBadge
                  key={feature}
                  featurePathName={feature as SubscriptionFeaturePathName}
                />
              ))}
              {activeFeatures.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{activeFeatures.length - 3} more
                </Badge>
              )}
            </div>
            <SubscriptionEditorModal opened={opened} onClose={close} subscription={subscription} />
          </>
        );
      },
      meta: { title: "Features" },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdAt")}</span>
        </div>
      ),
      meta: { title: "Created" },
    },
    {
      accessorKey: "renewedAt",
      header: createSortableHeader("Renewed"),
      cell: ({ row }) => {
        const renewedAt = row.getValue("renewedAt");
        return (
          <div className="flex items-center gap-2">
            <IconStar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{String(renewedAt ?? "N/A")}</span>
          </div>
        );
      },
      meta: { title: "Renewed" },
    },
    {
      accessorKey: "expiresAt",
      header: createSortableHeader("Expires"),
      cell: ({ row }) => {
        const expiresAt = row.getValue("expiresAt");
        const isExpired = row.original.isExpired;
        return (
          <div className="flex items-center gap-2">
            <IconCreditCard className="h-4 w-4 text-muted-foreground" />
            <Badge variant={isExpired ? "destructive" : "secondary"}>{expiresAt as string}</Badge>
          </div>
        );
      },
      meta: { title: "Expires" },
    },
  ];

  if (isSubscriptionsError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading subscriptions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubscriptionsLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  const tableData: SubscriptionTableData[] =
    subscriptions?.map((subscription) => {
      const expiresAt = dayjs(subscription.expiresAt);
      const isExpired = expiresAt.isBefore(dayjs());

      return {
        id: subscription.orgId,
        orgId: subscription.orgId,
        orgName: subscription.org?.name ?? "",
        planId: subscription?.basePlan?.id || "",
        planName: subscription?.basePlan?.name || "Unknown",
        features: subscription,
        createdAt: dayjs(subscription.createdAt).format("YYYY/MM/DD"),
        renewedAt: subscription.renewedAt ? dayjs(subscription.renewedAt).format("YYYY/MM/DD") : "",
        expiresAt: expiresAt.format("YYYY/MM/DD"),
        isExpired,
      };
    }) || [];

  // Calculate stats
  const totalSubscriptions = subscriptions?.length || 0;
  const activeSubscriptions = tableData.filter((sub) => !sub.isExpired).length;
  const expiredSubscriptions = tableData.filter((sub) => sub.isExpired).length;
  const renewedThisMonth =
    subscriptions?.filter(
      (sub) => sub.renewedAt && dayjs(sub.renewedAt).isAfter(dayjs().startOf("month")),
    ).length || 0;

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <IconCreditCard className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {translations("Subscriptions")}
              </h1>
            </div>
            <RefreshButton queryKeys={["subscriptions"]} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-ru-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Subscriptions
                </CardTitle>
                <IconPackage className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {totalSubscriptions}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All subscriptions</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-200 dark:border-green-800">
            <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Subscriptions
                </CardTitle>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {activeSubscriptions}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-destructive/30 ">
            <div className="absolute inset-0 bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expired Subscriptions
                </CardTitle>
                <Badge variant="destructive" className="text-xs px-2 py-0 h-5">
                  Expired
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-destructive ">{expiredSubscriptions}</div>
              <p className="text-xs text-destructive mt-1">Need renewal</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-purple-200 dark:border-purple-800">
            <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Renewed This Month
                </CardTitle>
                <IconStar className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {renewedThisMonth}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Recent renewals</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Subscription Management</h2>
      <p className="text-sm text-muted-foreground">
        Manage and view all subscriptions in your system
      </p>
      <div>
        <DataTable columns={columns} data={tableData} DataTableToolbar={DataTableToolbar} />
      </div>
    </div>
  );
}
