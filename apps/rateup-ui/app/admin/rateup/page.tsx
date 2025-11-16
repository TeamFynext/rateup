"use client";

import { useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  CreditCard,
  Edit,
  Package,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  usePaymentsPlans,
  useRateupPaymentsPlanDeleteMutation,
  useRateupPaymentsPlanMutation,
  useRateupPaymentsPlans,
  useRateupPaymentsPlanUpdateMutation,
} from "../../../backend/payment/payment.query";
import { useGetStripeProducts } from "../../../backend/payment/stripe/stripe.query";
import { ContainedTagInput } from "../../../components/input/ContainedInput/ContainedInput";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import RateupPlanModal from "../../../components/Modal/RateupPlanModal";
import { showLoadingToast } from "../../../utils/notifications";
import { DataTableToolbar } from "./data-table-toolbar";

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
  features: any;
  planType: string;
  paymentPlanId: string;
  stripeId: string;
  createdAt: string;
  trialDays: number;
}

const RateupPlan = () => {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [error, setError] = useState("");
  const [updatedField, setUpdatedField] = useState<any>("");
  const [
    openedDescriptonModal,
    { toggle: toggleDescriptonModal, close: closeDescriptonModal },
  ] = useDisclosure(false);
  const translations = useTranslations();
  const { data: plans, isPending, isError } = useRateupPaymentsPlans();
  const {
    data: razorPayPlans,
    isPending: isRazorPayPlansLoading,
    isError: isRazorPayPlansError,
  } = usePaymentsPlans();
  const { data: stripeProducts } = useGetStripeProducts();
  const rateupPaymentsPlanMutation = useRateupPaymentsPlanMutation(close);
  const rateupPaymentsPlanUpdateMutation =
    useRateupPaymentsPlanUpdateMutation(closeDescriptonModal);
  const rateupPaymentsPlanDelete = useRateupPaymentsPlanDeleteMutation();

  const columns: ColumnDef<RateupPlanTableData>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {row.getValue("id")}
        </div>
      ),
    },
    {
      accessorKey: "displayName",
      header: createSortableHeader("Display Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("displayName")}</span>
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string[];
        return (
          <div className="max-w-[200px]">
            {description && description.length > 0 ? (
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
              <span className="text-muted-foreground text-sm">
                No description
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "planType",
      header: createSortableHeader("Plan Type"),
      cell: ({ row }) => {
        const planType = row.getValue("planType") as string;
        return (
          <Badge variant={planType === "FREE" ? "secondary" : "default"}>
            {planType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "trialDays",
      header: createSortableHeader("Trial Days"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-mono">
            {row.getValue("trialDays") || 0}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "displayWidgetId",
      header: "Widget ID",
      cell: ({ row }) => {
        const widgetId = row.getValue("displayWidgetId") as string;
        return (
          <Badge variant={widgetId === "Nil" ? "destructive" : "secondary"}>
            {widgetId}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(row.getValue("createdAt")).toLocaleDateString()}
          </span>
        </div>
      ),
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
              setUpdatedField({
                id: row.original.id,
                paymentPlanId: row.original.paymentPlanId,
                description: row.original.description,
              });
              toggleDescriptonModal();
            }}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isError || isRazorPayPlansError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              An error occurred while loading plans.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isPending || isRazorPayPlansLoading) return <RateupLoader h={"100dvh"} />;

  const razorPayPlanFiltered =
    razorPayPlans?.data?.map((filteredPlan) => ({
      value: filteredPlan.id,
      label: filteredPlan.name,
    })) ?? [];

  const formattedStripeProducts = stripeProducts?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  const handleMutation = (updatedData: any) => {
    rateupPaymentsPlanUpdateMutation.mutate(updatedData);
    showLoadingToast(
      translations("Hold your data is getting updated"),
      "load-data",
      true,
      translations("Updating RateUp Plan"),
    );
    setUpdatedField("");
  };

  const planList = [
    { group: PaymentPlans.razorpay, items: razorPayPlanFiltered },
    { group: PaymentPlans.stripe, items: formattedStripeProducts },
  ];

  const tableData: RateupPlanTableData[] =
    plans?.map((plan) => ({
      id: plan.id,
      displayName: plan.displayName,
      name: plan.name,
      description: plan.description,
      displayWidgetId: plan.displayWidgetId?.length
        ? plan.displayWidgetId
        : "Nil",
      features: plan,
      planType: plan.planType,
      paymentPlanId: plan.paymentPlanId ?? "",
      stripeId: plan.stripeId,
      createdAt: plan?.createdAt,
      trialDays: plan?.trialDays,
    })) || [];

  // Calculate stats
  const totalPlans = tableData.length;
  const freePlans = tableData.filter((plan) => plan.planType === "FREE").length;
  const paidPlans = tableData.filter((plan) => plan.planType !== "FREE").length;
  const plansWithTrials = tableData.filter((plan) => plan.trialDays > 0).length;

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {translations("Rateup Plans")}
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Plans
                </CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
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
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
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
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                No cost plans
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-purple-200 dark:border-purple-800">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid Plans
                </CardTitle>
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {paidPlans}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Premium plans
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-amber-200 dark:border-amber-800">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  With Trials
                </CardTitle>
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                {plansWithTrials}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Trial available
              </p>
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
          DataTableToolbar={(props) => (
            <DataTableToolbar {...props} onCreatePlan={toggle} />
          )}
        />
      </div>

      <RateupPlanModal opened={opened} close={close} planList={planList} />

      <FormModalLayout
        opened={openedDescriptonModal}
        onClose={() => {
          closeDescriptonModal();
          setUpdatedField("");
        }}
        centered
        title={translations("Update Description")}
        buttonTitle="Update"
        includeCancelButton
        onSubmit={() => {
          if (!updatedField?.description.length) {
            setError("Cannot be empty");
            return;
          }
          handleMutation(updatedField);
        }}
      >
        <div className="mt-4 flex justify-between">
          <ContainedTagInput
            label={translations("Description")}
            placeholder={translations("Type Description and press enter")}
            withAsterisk
            value={updatedField?.description ?? []}
            onChange={(e) => {
              if (!e) return;
              setError("");
              setUpdatedField({
                ...updatedField,
                description: e,
              });
            }}
            error={error}
            description={"Use || for split"}
            splitChars={["||"]}
          />
        </div>
      </FormModalLayout>
    </div>
  );
};

export default RateupPlan;
