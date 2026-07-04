import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Calendar, Clock, CreditCard, DollarSign, Package, Trash2, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useRateupPaymentsPlans } from "@/backend/payment/payment.query";
import {
  useDeleteStripeProduct,
  useGetStripeProducts,
  useUpdateStripeProduct,
} from "@/backend/payment/stripe/stripe.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { PaymentPlanStatus } from "@/types/enums.ts";

import { ProductsDataTableToolbar } from "./products-data-table-toolbar.tsx";

interface ProductTableData {
  id: string;
  name: string;
  description: string;
  type: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  liveMode: boolean;
  active: boolean;
  status: PaymentPlanStatus;
  createdAt: string;
  canDelete: boolean;
}

const StripeProducts = () => {
  const { data: products } = useGetStripeProducts();
  const updateProductMutate = useUpdateStripeProduct();
  const deleteStripeProduct = useDeleteStripeProduct();
  const { data: rateupPlans } = useRateupPaymentsPlans();
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  const handleDeleteProduct = async (productId: string) => {
    const shouldDelete = await confirm({
      title: translations("Delete Stripe Product"),
      description: translations("Are you sure to delete this stripe product?"),
      confirmText: translations("Delete"),
      cancelText: translations("cancel"),
    });

    if (!shouldDelete) return;

    const product = products && products?.find((prod) => prod.productId == productId);
    const productInRateupPlan =
      rateupPlans && rateupPlans?.find((plan) => plan?.stripeId === product?.id);
    if (productInRateupPlan) {
      toast.error(translations("Unable to delete. Product is in use in rateup plan"), {
        id: "stripe",
      });
      return;
    }
    toast.loading(translations("Hold on..Stripe Product is getting deleted"), {
      id: "stripe",
    });
    deleteStripeProduct.mutate(productId);
  };

  const columns: ColumnDef<ProductTableData>[] = [
    {
      accessorKey: "id",
      header: "Product ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground max-w-[180px] truncate">
          {row.getValue("id")}
        </div>
      ),
      meta: { title: "Product ID" },
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
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{row.getValue("type")}</Badge>
        </div>
      ),
      meta: { title: "Type" },
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
      accessorKey: "interval",
      header: "Interval",
      cell: ({ row }) => <Badge variant="secondary">{row.getValue("interval")}</Badge>,
      meta: { title: "Interval" },
    },
    {
      accessorKey: "intervalCount",
      header: "Interval Count",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{row.getValue("intervalCount")}</span>
        </div>
      ),
      meta: { title: "Interval Count" },
    },
    {
      accessorKey: "liveMode",
      header: "Live Mode",
      cell: ({ row }) => {
        const liveMode = row.getValue("liveMode");
        return (
          <Badge variant={liveMode ? "default" : "destructive"}>
            {liveMode ? translations("Live") : translations("Inactive")}
          </Badge>
        );
      },
      meta: { title: "Live Mode" },
    },
    {
      accessorKey: "active",
      header: "Active",
      cell: ({ row }) => {
        const active = row.getValue("active");
        return (
          <Badge variant={active ? "default" : "destructive"}>
            {active ? translations("Active") : translations("Inactive")}
          </Badge>
        );
      },
      meta: { title: "Active" },
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
            items={[
              { value: PaymentPlanStatus.NULL, label: "NULL" },
              { value: PaymentPlanStatus.LIVE, label: "LIVE" },
              { value: PaymentPlanStatus.ACTIVE, label: "ACTIVE" },
              { value: PaymentPlanStatus.INACTIVE, label: "INACTIVE" },
            ]}
            onValueChange={(value) => {
              updateProductMutate.mutate({
                productId: row.original.id,
                status: value as PaymentPlanStatus,
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
              <SelectItem value={PaymentPlanStatus.INACTIVE}>INACTIVE</SelectItem>
            </SelectContent>
          </Select>
        );
      },
      meta: { title: "Status" },
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteProduct(row.original.id);
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

  const tableData: ProductTableData[] = products
    ? products?.map((product) => ({
        id: product.productId,
        name: product.name,
        createdAt: dayjs.unix(product.createdAt).format("DD/MM/YYYY HH:mm:ss"),
        amount: product.amount,
        currency: product.currency,
        intervalCount: product.intervalCount,
        interval: product.interval,
        status: product.status,
        description: product.description,
        type: product.type,
        liveMode: product.liveMode,
        active: product.active,
        canDelete: ![PaymentPlanStatus.ACTIVE, PaymentPlanStatus.LIVE].includes(product.status),
      }))
    : [];

  // Calculate stats
  const totalProducts = tableData.length;
  const activeProducts = tableData.filter((p) => p.active).length;
  const liveProducts = tableData.filter((p) => p.liveMode).length;
  const inactiveProducts = tableData.filter((p) => !p.active).length;

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                {translations("List of products from Stripe DB")}
              </CardTitle>
            </div>
            <RefreshButton queryKeys={["stripeProducts"]} />
          </div>
        </CardHeader>
      </Card>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Live Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{liveProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveProducts}</div>
          </CardContent>
        </Card>
      </div>
      <DataTable columns={columns} data={tableData} DataTableToolbar={ProductsDataTableToolbar} />
    </div>
  );
};

export default StripeProducts;
