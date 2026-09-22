// Extracted from the `/dashboard/loyalty/customers/` route so the route file carries routing
// config only. The opened member lives in the URL as `?phone=`, not in component state, so
// other screens — the Activity ledger — can link straight to a customer.

import {
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconFilter,
  IconLink,
  IconPencil,
  IconPhone,
  IconSearch,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useExportCustomersMutation,
  useLoyaltyCustomers,
  useUpdateLoyaltyCustomerMutation,
} from "@/backend/loyalty/customer/customer.query";
import type { LoyaltyChannel } from "@/backend/loyalty/program.api";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { BackLink } from "@/components/common/back-link.tsx";
import { PAGE_TITLE } from "@/components/common/page-heading.tsx";
import { CustomerSummaryPanel } from "@/components/loyalty/cashier/CustomerSummaryPanel.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import type { WaInboxMessage } from "@/types/global";
import { docsPath } from "@/utils/constants.ts";

import { LOYALTY_PATHS } from "../paths.ts";
import type { CustomersSearch } from "./customers.search.ts";
import { EditCustomerDialog } from "./EditCustomerDialog.tsx";

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
  preferredChannel?: LoyaltyChannel | null;
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

export function CustomerPage({ search }: Readonly<{ search: CustomersSearch }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openedPhone = search.phone;
  const [editing, setEditing] = useState(false);
  const updateCustomer = useUpdateLoyaltyCustomerMutation();
  const { data: program } = useLoyaltyProgram();

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
  //
  // An opened member narrows the list to them, so the row behind the details view is one
  // the list already holds and `?phone=` is the whole of that view's state. That is what
  // lets the Activity ledger link straight to a customer, and it keeps the row derived
  // from the query rather than copied into state, so an edit shows up on refetch.
  const { data: customersData, isLoading } = useLoyaltyCustomers(
    pagination,
    openedPhone ?? searchTerm,
    sorting,
    [],
  );
  const exportMutation = useExportCustomersMutation();
  const user = useUser();

  const customers: CustomerDetails[] = customersData ?? [];
  const selectedCustomer = openedPhone
    ? (customers.find((row) => onlyDigits(row.contact?.phone) === onlyDigits(openedPhone)) ?? null)
    : null;

  // The details view is found by number, so a row without one has nothing to open. The API
  // only enrols contacts that have a phone, so this is a guard rather than a case to design for.
  const openCustomer = (phone: string | undefined) => {
    if (phone) navigate({ to: LOYALTY_PATHS.customers, search: { phone } });
  };

  const getTierBadgeClassName = (tierColor: string) => {
    if (tierColor === "purple") {
      return "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900";
    }
    if (tierColor === "yellow") {
      return "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900";
    }
    if (tierColor === "amber") {
      return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-900";
    }
    return "bg-muted text-foreground hover:bg-muted border border-border";
  };

  const columns: ColumnDef<CustomerDetails>[] = [
    {
      accessorKey: "contact.name",
      id: "customerName",
      header: "Customer",
      // The name opens the member, which is what an Actions column with a single "View"
      // button was there to do. A row with one action does not need a column for it.
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => openCustomer(row.original.contact?.phone)}
          className="group -mx-1 flex items-center gap-3 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ContactAvatar name={row.getValue("customerName")} size="sm" />
          <div>
            <p className="text-sm group-hover:underline">{row.getValue("customerName")}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconPhone className="w-3 h-3" />
              {row.original.contact?.phone}
            </p>
          </div>
        </button>
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
  ];

  if (isLoading) return <div className="flex items-center justify-center py-8">loading</div>;
  return (
    <>
      {!openedPhone ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className={cn(PAGE_TITLE, "mb-1")}>{t("Customers")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("Manage your loyalty program members")}
              </p>
            </div>
            {""}
            <div className="flex items-start justify-between gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button loading={exportMutation.isPending} />}>
                  <IconDownload className="w-4 h-4 mr-2" />
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
              </DropdownMenu>
              {""}
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
          <DataTable columns={columns} data={customers} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <BackLink to={LOYALTY_PATHS.customers} search={{}} label={t("Customers")} />
            {/* Their own details — name, birthday — as opposed to their points and tier,
                which the panel below owns and the counter changes. Only offered once the
                account is known: a link can name a number the programme has no member for. */}
            {selectedCustomer && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <IconPencil className="mr-2 h-4 w-4" />
                {t("Edit details")}
              </Button>
            )}
          </div>
          {/* The same panel staff see at the counter; actions open the cashier. It carries
              its own loader and its own "no loyalty account" empty state. */}
          <CustomerSummaryPanel phone={openedPhone} />

          {selectedCustomer && (
            <EditCustomerDialog
              // Keyed so each member opens the dialog with their own values, rather than
              // whoever was edited first.
              key={selectedCustomer.id}
              open={editing}
              customer={selectedCustomer.contact}
              channels={program?.enabledChannels}
              preferredChannel={selectedCustomer.preferredChannel}
              isSaving={updateCustomer.isPending}
              onClose={() => setEditing(false)}
              onSave={(patch) =>
                updateCustomer.mutate(
                  { customerId: selectedCustomer.id, data: patch },
                  { onSuccess: () => setEditing(false) },
                )
              }
            />
          )}
        </div>
      )}
    </>
  );
}

/**
 * Phone numbers are compared as digits: the ledger, the cashier and the URL each spell the
 * same number differently, and the router may have round-tripped it through a number.
 */
function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}
