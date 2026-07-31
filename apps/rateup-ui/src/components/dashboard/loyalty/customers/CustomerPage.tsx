// Extracted verbatim from the `/dashboard/loyalty/customers/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconArrowLeft,
  IconChevronRight,
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconFilter,
  IconLink,
  IconLoader2,
  IconPhone,
  IconSearch,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useExportCustomersMutation,
  useGetLoyaltyCustomerById,
  useLoyaltyCustomers,
} from "@/backend/loyalty/customer/customer.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { CustomerDetailPanel } from "@/components/loyalty/CustomerDetailPanel.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PremiumAvatar } from "@/components/ui/premium-avatar.tsx";
import { useUser } from "@/context/UserContext.tsx";
import type { WaInboxMessage } from "@/types/global";
import { docsPath } from "@/utils/constants.ts";

interface CustomerDetails {
  id: string;
  programId: string;
  contactId: string;
  currentPoints: number;
  lifetimePoints: number;
  currentTierId: string;
  referralCode: string;
  referredById: string | null;
  status: string;
  createdAt: string;
  lastActivityAt: string;
  updatedAt: string;
  currentTier: {
    id: string;
    programId: string;
    name: string;
    threshold: number;
    pointsMultiplier: string;
    color: string;
    benefitsDescription: string;
    priority: number;
    createdAt: string;
  };
  contact: {
    id: string;
    createdAt: string;
    name: string;
    phone: string;
    source: string;
    orgId: string;
    tags: string[] | null;
    consent: boolean;
    email: string;
    dob: string | null;
    external_id: string | null;
    aiWaChat: boolean;
    isAiBotActive: boolean;
    chatbotId: string;
    waMessageAssignStatus: string;
    lastReceivedMessageTimeStamp: string;
    whatsappUserName: string;
    blockedOnWhatsApp: boolean;
    igsId: string | null;
    profilePic: string | null;
    followerCount: number | null;
    isIgVerifiedUser: boolean | null;
    other: unknown | null;
    lifecycleId: string;
    closedAt: string | null;
    closedBy: string | null;
    lastMessageBody: WaInboxMessage | null;
    lastMessageWaCreatedAt: string;
    lastMessagePlatform: string;
    lastReceivedMetadata: unknown | null;
    lastMessageSourceIdentifier: string;
    lastSentMessageTimeStamp: string;
    notes: string | null;
  };
  assignedRewards: {
    id: string;
    rewardId: string;
    accountId: string;
    assignedAt: string;
  }[];
}

export function CustomerPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "details">("list");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting] = useState({
    id: "name",
    desc: false,
  });

  // API Hooks
  const { data: customersData, isLoading } = useLoyaltyCustomers(
    pagination,
    searchTerm,
    sorting,
    [],
  );
  const { data: customerDetails } = useGetLoyaltyCustomerById(selectedCustomerId ?? "");
  const exportMutation = useExportCustomersMutation();
  const user = useUser();

  const getTierBadgeClassName = (tierColor: string) => {
    if (tierColor === "purple") {
      return "bg-purple-50 text-purple-700 hover:bg-purple-50 border border-purple-200";
    }
    if (tierColor === "yellow") {
      return "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border border-yellow-200";
    }
    if (tierColor === "amber") {
      return "bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200";
    }
    return "bg-gray-100 text-gray-700 hover:bg-gray-100 border border-gray-200";
  };

  const columns: ColumnDef<CustomerDetails>[] = [
    {
      accessorKey: "contact.name",
      id: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PremiumAvatar name={row.getValue("customerName") ?? ""} size="sm" />
          <div>
            <p className="font-semibold text-sm">{row.getValue("customerName")}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <IconPhone className="w-3 h-3" />
              {row.original.contact?.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "currentTier.name",
      id: "tier",
      header: "Tier",
      cell: ({ row }) => (
        <Badge className={getTierBadgeClassName(row.original.currentTier?.color || "")}>
          {row.getValue("tier")}
        </Badge>
      ),
    },
    {
      accessorKey: "currentPoints",
      header: "Points",
      cell: ({ row }) => (
        <span className="font-semibold">
          {row.getValue<number>("currentPoints")?.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "lifetimePoints",
      header: t("Lifetime"),
      cell: ({ row }) => (
        <span className="text-primary font-medium">
          {row.getValue<number>("lifetimePoints")?.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "contact.dob",
      id: "dob",
      header: "Date of Birth",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("dob") ? new Date(row.getValue("dob")).toLocaleDateString() : ""}
        </span>
      ),
    },
    {
      accessorKey: "lastActivityAt",
      header: "Last Active",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.getValue("lastActivityAt")).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "referralCode",
      header: t("Referral Code"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {row.getValue("referralCode")}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-primary/10"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(row.getValue("referralCode"));
                toast.success(t("Referral code copied to clipboard!"));
              } catch (err) {
                console.error("Failed to copy referral code:", err);
                toast.error(t("Failed to copy referral code"));
              }
            }}
            title={t("Copy referral code")}
          >
            <IconCopy className="w-3.5 h-3.5 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-primary/10"
            onClick={async () => {
              try {
                const link = `${import.meta.env.VITE_FRONTEND_URL}/loyalty/${user?.user?.orgId}/register?refer_code=${row.getValue("referralCode")}`;
                await navigator.clipboard.writeText(link);
                toast.success(t("Referral link copied to clipboard!"));
              } catch {
                toast.error(t("Failed to copy referral link"));
              }
            }}
            title={t("Copy referral link")}
          >
            <IconLink className="w-3.5 h-3.5 text-primary" />
          </Button>
        </div>
      ),
    },
    {
      id: "actions",
      header: t("Actions"),
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => {
            handleViewCustomer(row.original);
          }}
        >
          {t("View")}
          <IconChevronRight className="w-4 h-4 ml-1" />
        </Button>
      ),
    },
  ];

  const handleViewCustomer = (customer: CustomerDetails) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setViewMode("details");
  };

  if (isLoading) return <div className="flex items-center justify-center py-8">loading</div>;
  return (
    <>
      {viewMode === "list" ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl mb-1">{t("Customers")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("Manage your loyalty program members")}
              </p>
            </div>{" "}
            <div className="flex items-start justify-between gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button disabled={exportMutation.isPending} />}>
                  {exportMutation.isPending ? (
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <IconDownload className="w-4 h-4 mr-2" />
                  )}
                  {t("Export Data")}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportMutation.mutate("csv")}>
                    <IconFileText className="w-4 h-4 mr-2" />
                    {t("Export as CSV")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportMutation.mutate("excel")}>
                    <IconFileSpreadsheet className="w-4 h-4 mr-2" />
                    {t("Export as Excel")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>{" "}
              <InfoButton docUrl={`${docsPath}/loyality/customers`} />
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by name or phone...")}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <IconFilter className="w-4 h-4 mr-2" />
              {t("Filter")}
            </Button>
          </div>

          {/* Customers Table */}
          <DataTable columns={columns} data={customersData || []} />
        </div>
      ) : (
        selectedCustomer && (
          <div className="space-y-5">
            <Button
              variant="ghost"
              onClick={() => {
                setViewMode("list");
                setSelectedCustomerId(null);
              }}
            >
              <IconArrowLeft className="w-4 h-4 mr-2" />
              {t("Back to Customers")}
            </Button>
            <CustomerDetailPanel
              customer={{
                id: selectedCustomer.id,
                contactId: selectedCustomer.contactId,
                name: selectedCustomer.contact.name,
                phone: selectedCustomer.contact.phone,
                email: selectedCustomer.contact.email,
                currentPoints: selectedCustomer.currentPoints,
                lifetimePoints: selectedCustomer.lifetimePoints,
                currentTier: selectedCustomer.currentTier
                  ? {
                      id: selectedCustomer.currentTier.id,
                      name: selectedCustomer.currentTier.name,
                      color: selectedCustomer.currentTier.color,
                    }
                  : null,
                status: selectedCustomer.status,
                referralCode: selectedCustomer.referralCode,
                createdAt: selectedCustomer.createdAt,
              }}
              transactions={customerDetails?.transactions}
              orgId={user?.user?.orgId || ""}
            />
          </div>
        )
      )}
    </>
  );
}
