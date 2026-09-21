// Extracted verbatim from the `/admin/rateup/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconBolt,
  IconCalendar,
  IconCreditCard,
  IconEdit,
  IconPackage,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import {
  usePaymentsPlans,
  useRateupPaymentsPlanDeleteMutation,
  useRateupPaymentsPlans,
} from "@/backend/payment/payment.query";
import { useGetStripeProducts } from "@/backend/payment/stripe/stripe.query";
import { DataTableToolbar } from "@/components/admin/rateup/data-table-toolbar.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import RateupPlanModal from "@/components/Modal/RateupPlanModal.tsx";
import type { RateupPlanFormValues } from "@/components/Modal/RateupPlanModal.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";

enum PaymentPlans {
  razorpay = "Razorpay Plans",
  stripe = "Stripe Products",
}

interface RateupPlanTableData {
  id: string;
  displayName: string;
  name: string;
  description: string[];
  displayWidgetId: string;
  features: RateupPaymentPlan;
  planType: string;
  paymentPlanId: string;
  stripeId: string;
  createdAt: string;
}

export function RateupPlan() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [editPlan, setEditPlan] = useState<RateupPlanFormValues | null>(null);
  const { t: translations } = useTranslation();
  const { data: plans, isPending, isError } = useRateupPaymentsPlans();
  const {
    data: razorPayPlans,
    isPending: isRazorPayPlansLoading,
    isError: isRazorPayPlansError,
  } = usePaymentsPlans();
  const { data: stripeProducts } = useGetStripeProducts();

  const rateupPaymentsPlanDelete = useRateupPaymentsPlanDeleteMutation();

  const columns: ColumnDef<RateupPlanTableData>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">{row.getValue("id")}</div>
      ),
      meta: { title: "ID" },
    },
    {
      accessorKey: "displayName",
      header: createSortableHeader("Display Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconStar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("displayName")}</span>
        </div>
      ),
      meta: { title: "Display Name" },
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconPackage className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue("name")}</span>
        </div>
      ),
      meta: { title: "Name" },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = (row.getValue("description") as string[] | undefined) ?? [];
        return (
          <div className="max-w-[200px]">
            {description.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {description.slice(0, 2).map((desc, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {desc}
                  </Badge>
                ))}
                {description.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{description.length - 2} more
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No description</span>
            )}
          </div>
        );
      },
      meta: { title: "Description" },
    },
    {
      accessorKey: "planType",
      header: createSortableHeader("Plan Type"),
      cell: ({ row }) => {
        const planType = String(row.getValue("planType") ?? "");
        return <Badge variant={planType === "FREE" ? "secondary" : "default"}>{planType}</Badge>;
      },
      meta: { title: "Plan Type" },
    },
    {
      accessorKey: "displayWidgetId",
      header: "Widget ID",
      cell: ({ row }) => {
        const widgetId = String(row.getValue("displayWidgetId") ?? "");
        return <Badge variant={widgetId === "Nil" ? "destructive" : "secondary"}>{widgetId}</Badge>;
      },
      meta: { title: "Widget ID" },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(row.getValue("createdAt")).toLocaleDateString()}
          </span>
        </div>
      ),
      meta: { title: "Created At" },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditPlan(row.original.features);
            }}
            className="h-8 w-8 p-0"
          >
            <IconEdit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              rateupPaymentsPlanDelete.mutate(row.original.id);
            }}
            className="h-8 w-8 p-0"
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { title: "Actions" },
    },
  ];

  if (isError || isRazorPayPlansError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading plans.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isPending || isRazorPayPlansLoading) return <RateupLoader className="h-dvh" />;

  const razorPayPlanFiltered =
    razorPayPlans?.data?.map((filteredPlan: { id: string; name: string }) => ({
      value: filteredPlan.id,
      label: filteredPlan.name,
    })) ?? [];

  const formattedStripeProducts = stripeProducts?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  const planList = [
    { group: PaymentPlans.razorpay, items: razorPayPlanFiltered },
    { group: PaymentPlans.stripe, items: formattedStripeProducts },
  ];

  const tableData: RateupPlanTableData[] =
    plans?.map((plan: RateupPaymentPlan) => ({
      id: plan.id,
      displayName: plan.displayName,
      name: plan.name,
      description: plan.description,
      displayWidgetId: plan.displayWidgetId?.length ? plan.displayWidgetId : "Nil",
      features: plan,
      planType: plan.planType,
      paymentPlanId: plan.paymentPlanId ?? "",
      stripeId: plan.stripeId,
      createdAt: plan?.createdAt,
    })) || [];

  // Calculate stats
  const totalPlans = tableData.length;
  const freePlans = tableData.filter((plan) => plan.planType === "FREE").length;
  const paidPlans = tableData.filter((plan) => plan.planType !== "FREE").length;

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <IconBolt className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {translations("Rateup Plans")}
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-ru-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Plans
                </CardTitle>
                <IconPackage className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {totalPlans}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All plans</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-200 dark:border-green-800">
            <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Free Plans
                </CardTitle>
                <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                  FREE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {freePlans}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">No cost plans</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-purple-200 dark:border-purple-800">
            <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid Plans
                </CardTitle>
                <IconCreditCard className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {paidPlans}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Premium plans</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Plan Management</h2>
      <p className="text-sm text-muted-foreground">
        Manage and configure all RateUp plans in your system
      </p>
      <div>
        <DataTable
          columns={columns}
          data={tableData}
          DataTableToolbar={(props) => <DataTableToolbar {...props} onCreatePlan={toggle} />}
        />
      </div>
      <RateupPlanModal opened={opened} close={close} planList={planList} />
      <RateupPlanModal
        opened={Boolean(editPlan)}
        close={() => setEditPlan(null)}
        planList={planList}
        plan={editPlan}
      />
    </div>
  );
}
