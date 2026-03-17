"use client";

import React, { useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  Trash2,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import {
  useDeletePaymentPlanMutation,
  usePaymentPlanUpdate,
  usePaymentsPlans,
  useRateupPaymentsPlans,
} from "../../../backend/payment/payment.query";
import RefreshButton from "../../../components/Button/RefreshButton";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { PaymentPlanStatus } from "../../../types/enums";
import { PlansDataTableToolbar } from "./plans-data-table-toolbar";

interface PlanTableData {
  id: string;
  name: string;
  createdAt: string;
  amount: number;
  currency: string;
  period: string;
  interval: number;
  status: PaymentPlanStatus;
  description: string;
  canDelete: boolean;
}

const RazorpayPlans = () => {
  const planUpdateMutate = usePaymentPlanUpdate();
  const { data: rateupPlans } = useRateupPaymentsPlans();
  const translations = useExtracted();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const deletePaymentPlanMutation = useDeletePaymentPlanMutation();

  const [
    openedDeleteModal,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const { data: plans, isLoading, isError } = usePaymentsPlans();

  const handleUpdatePlans = (updatedData: any) => {
    planUpdateMutate.mutate(updatedData);
  };

  const handleDeleteClick = () => {
    const planIdLocal = Array.isArray(plans?.data)
      ? plans?.data?.find((plan) => plan?.planId == selectedPlanId)?.id
      : "";
    const planInrateupPlans =
      rateupPlans &&
      rateupPlans?.find((plan) => plan.paymentPlanId === planIdLocal);

    if (planInrateupPlans) {
      toast.error(
        translations("Unable to delete.Plan is in use in rateup plan"),
        {
          id: "plan",
        },
      );
      return;
    }
    deletePaymentPlanMutation.mutate({
      id: planIdLocal,
      planId: selectedPlanId,
    });
  };

  const columns: ColumnDef<PlanTableData>[] = [
    {
      accessorKey: "id",
      header: "Razorpay Plan ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {row.getValue("id")}
        </div>
      ),
      meta: { title: "Razorpay Plan ID" },
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
      meta: { title: "Name" },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdAt")}</span>
        </div>
      ),
      meta: { title: "Created At" },
    },
    {
      accessorKey: "amount",
      header: createSortableHeader("Amount"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{row.getValue("amount")}</span>
        </div>
      ),
      meta: { title: "Amount" },
    },
    {
      accessorKey: "currency",
      header: "Currency",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.getValue("currency")}
        </Badge>
      ),
      meta: { title: "Currency" },
    },
    {
      accessorKey: "period",
      header: "Period",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("period")}</Badge>
      ),
      meta: { title: "Period" },
    },
    {
      accessorKey: "interval",
      header: "Interval",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{row.getValue("interval")}</span>
        </div>
      ),
      meta: { title: "Interval" },
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as PaymentPlanStatus;
        const getStatusColor = (status: PaymentPlanStatus) => {
          switch (status) {
            case PaymentPlanStatus.ACTIVE:
              return "default";
            case PaymentPlanStatus.LIVE:
              return "default";
            case PaymentPlanStatus.INACTIVE:
              return "destructive";
            default:
              return "secondary";
          }
        };

        return (
          <Select
            value={status}
            onValueChange={(value) => {
              const planIdLocal = Array.isArray(plans?.data)
                ? plans?.data?.find((plan) => plan?.planId == row.original.id)
                    ?.id
                : "";
              handleUpdatePlans({
                id: planIdLocal,
                planId: row.original.id,
                data: { status: value as PaymentPlanStatus },
              });
            }}
          >
            <SelectTrigger className="h-8 w-32">
              <Badge variant={getStatusColor(status)}>{status}</Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PaymentPlanStatus.NULL}>NULL</SelectItem>
              <SelectItem value={PaymentPlanStatus.LIVE}>LIVE</SelectItem>
              <SelectItem value={PaymentPlanStatus.ACTIVE}>ACTIVE</SelectItem>
              <SelectItem value={PaymentPlanStatus.INACTIVE}>
                INACTIVE
              </SelectItem>
            </SelectContent>
          </Select>
        );
      },
      meta: { title: "Status" },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground max-w-[150px] truncate">
          {row.getValue("description") || "N/A"}
        </span>
      ),
      meta: { title: "Description" },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPlanId(row.original.id);
            openDeleteModal();
          }}
          disabled={!row.original.canDelete}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
      meta: { title: "Actions" },
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{translations("error occured")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const tableData: PlanTableData[] = Array.isArray(plans?.data)
    ? plans?.data
        ?.filter((p) => p.status !== "INACTIVE")
        ?.map((plan) => ({
          id: plan.planId,
          name: plan.name,
          createdAt: dayjs.unix(plan.createdAt).format("DD/MM/YYYY HH:mm:ss"),
          amount: plan.amount,
          currency: plan.currency,
          period: plan.period,
          interval: plan.interval,
          status: plan.status,
          description: plan.description,
          canDelete: ![
            PaymentPlanStatus.ACTIVE,
            PaymentPlanStatus.LIVE,
          ].includes(plan.status),
        }))
    : [];

  const activePlans = tableData.filter((p) =>
    [PaymentPlanStatus.ACTIVE, PaymentPlanStatus.LIVE].includes(p.status),
  );
  const inactivePlans = tableData.filter(
    (p) => p.status === PaymentPlanStatus.INACTIVE,
  );

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                {translations("List of plans from Razorpay DB")}
              </CardTitle>
            </div>
            <RefreshButton queryKeys={["paymentPlansQuery"]} />
          </div>
        </CardHeader>
      </Card>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tableData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activePlans.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inactivePlans.length}
            </div>
          </CardContent>
        </Card>
      </div>
      <DataTable
        columns={columns}
        data={tableData}
        DataTableToolbar={PlansDataTableToolbar}
      />
      <ConfirmationModal
        opened={openedDeleteModal}
        onClose={closeDeleteModal}
        forDeleteFunctionality
        confirmLabel={translations("Delete")}
        headerTitle={translations("Delete RazorPay Plan")}
        onConfirm={() => {
          toast.loading(translations("Hold on..Plan is getting deleted"), {
            id: "plan",
          });
          handleDeleteClick();
        }}
        headerLabel={translations("Are you sure to delete this plan?")}
        closeLabel={translations("cancel")}
      />
    </div>
  );
};

export default RazorpayPlans;
