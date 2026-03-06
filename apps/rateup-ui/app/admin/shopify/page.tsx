"use client";

import { useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { ColumnDef } from "@tanstack/react-table";
import { Building2, Calendar, ShoppingBag, Store, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums";
import { ActiveStatusBadge } from "@/app/dashboard/apps&services/shopify/page";
import { useGetAllIntegrations } from "@/backend/appsIntegration/integration.query";
import { useDeleteShopifyIntegrationByShop } from "@/backend/appsIntegration/shopify/shopify.query";
import RefreshButton from "@/components/Button/RefreshButton";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIsoDateStringWithTime } from "@/utils/dateTime";

import { DataTableToolbar } from "./data-table-toolbar";

interface ShopifyTableData {
  id: string;
  shop: string;
  orgId: string;
  createdAt: string;
  status: boolean;
}

const Shopify = () => {
  const { data: integrations } = useGetAllIntegrations();
  const [selectedShop, setSelectedShop] = useState("");
  const [opened, { open: openConfirmModal, close }] = useDisclosure(false);
  const deleteIntegration = useDeleteShopifyIntegrationByShop();
  const translations = useTranslations();

  const columns: ColumnDef<ShopifyTableData>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
          {row.getValue("id")}
        </div>
      ),
      meta: { title: "ID" },
    },
    {
      accessorKey: "shop",
      header: createSortableHeader("Shop"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("shop")}</span>
        </div>
      ),
      meta: { title: "Shop" },
    },
    {
      accessorKey: "orgId",
      header: createSortableHeader("Organization ID"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
            {row.getValue("orgId")}
          </div>
        </div>
      ),
      meta: { title: "Organization ID" },
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as boolean;
        return <ActiveStatusBadge active={status} />;
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
            setSelectedShop(row.original.shop);
            openConfirmModal();
          }}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
      meta: { title: "Actions" },
    },
  ];

  const tableData: ShopifyTableData[] = integrations
    ? integrations
        .filter((integration) => integration.name === IntegratedApps.shopify)
        ?.map((integration) => ({
          id: integration.id,
          shop: integration.credential.session.shop,
          orgId: integration.orgId,
          createdAt: formatIsoDateStringWithTime(integration.createdAt),
          status: integration.active,
        }))
    : [];

  const handleDelete = () => {
    toast.loading("Deleting...", {
      id: "integration",
    });
    deleteIntegration.mutate({ shop: selectedShop });
  };

  // Calculate stats
  const totalIntegrations = tableData.length;
  const activeIntegrations = tableData.filter((item) => item.status).length;
  const inactiveIntegrations = tableData.filter((item) => !item.status).length;

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {translations("Integrated Shopify")}
              </h1>
            </div>
            <RefreshButton queryKeys={["integrations"]} />
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              Shopify Integration Management
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Manage all Shopify store integrations connected to your platform.
            You can view integration status and remove integrations when needed.
          </p>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold tracking-tight">
        Integration Management
      </h2>
      <p className="text-sm text-muted-foreground">
        View and manage all Shopify store integrations
      </p>

      <div>
        <DataTable
          columns={columns}
          data={tableData}
          DataTableToolbar={DataTableToolbar}
        />
      </div>

      <ConfirmationModal
        confirmLabel={translations("Yes")}
        headerLabel={translations("Are you sure, you want to delete it?")}
        headerTitle={translations("Delete")}
        onClose={close}
        onConfirm={handleDelete}
        forDeleteFunctionality
        opened={opened}
        closeLabel="No"
      />
    </div>
  );
};

export default Shopify;
