"use client";

import { useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Gift,
  Link,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  useAwardPointsMutation,
  useExportCustomersMutation,
  useGetLoyaltyCustomerById,
  useLoyaltyCustomers,
  useUpdateLoyaltyCustomerMutation,
} from "@/backend/loyalty/customer/customer.query";
import { DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PremiumAvatar } from "@/components/ui/premium-avatar";
import { useUser } from "@/context/UserContext";

interface Customer {
  id: string;
  tier: string;
  tierColor: string;
  points: number;
  lifetimePoints: number;
  lastActive: string;
  joinDate: string;
  location: string;
  referralCode: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  currentTier?: {
    name: string;
    color: string;
    id: string;
  };
}

const CustomerPage = () => {
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<"list" | "details">("list");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState({
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
  // const { data: customerDetails, isLoading: isLoadingDetails } =
  //   useGetLoyaltyCustomerById(selectedCustomerId);
  const awardPointsMutation = useAwardPointsMutation();
  const updateCustomerMutation = useUpdateLoyaltyCustomerMutation();
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

  const getTierCardClassName = (tierColor: string) => {
    if (tierColor === "purple") {
      return "border border-purple-100 bg-purple-50/50";
    }
    if (tierColor === "yellow") {
      return "border border-yellow-100 bg-yellow-50/50";
    }
    if (tierColor === "amber") {
      return "border border-amber-100 bg-amber-50/50";
    }
    return "border border-gray-100 bg-gray-50/50";
  };

  const getTierIconClassName = (tierColor: string) => {
    if (tierColor === "purple") {
      return "w-5 h-5 text-purple-600";
    }
    if (tierColor === "yellow") {
      return "w-5 h-5 text-yellow-600";
    }
    if (tierColor === "amber") {
      return "w-5 h-5 text-amber-600";
    }
    return "w-5 h-5 text-gray-600";
  };

  const getTierTextClassName = (tierColor: string) => {
    if (tierColor === "purple") {
      return "text-3xl font-bold text-purple-600";
    }
    if (tierColor === "yellow") {
      return "text-3xl font-bold text-yellow-600";
    }
    if (tierColor === "amber") {
      return "text-3xl font-bold text-amber-600";
    }
    return "text-3xl font-bold text-gray-600";
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "contact.name",
      id: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PremiumAvatar name={row.getValue("customerName") ?? ""} size="sm" />
          <div>
            <p className="font-semibold text-sm">
              {row.getValue("customerName")}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
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
        <Badge
          className={getTierBadgeClassName(
            row.original.currentTier?.color || "",
          )}
        >
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
                await navigator.clipboard.writeText(
                  row.getValue("referralCode"),
                );
                toast.success(t("Referral code copied to clipboard!"));
              } catch (err) {
                console.error("Failed to copy referral code:", err);
                toast.error(t("Failed to copy referral code"));
              }
            }}
            title={t("Copy referral code")}
          >
            <Copy className="w-3.5 h-3.5 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-primary/10"
            onClick={async () => {
              try {
                const link = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/loyalty/${user?.user?.orgId}/register?refer_code=${row.getValue("referralCode")}`;
                await navigator.clipboard.writeText(link);
                toast.success(t("Referral link copied to clipboard!"));
              } catch {
                toast.error(t("Failed to copy referral link"));
              }
            }}
            title={t("Copy referral link")}
          >
            <Link className="w-3.5 h-3.5 text-primary" />
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
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      ),
    },
  ];
  // Mock transaction history
  const getTransactionHistory = (customerId: string) => {
    const transactions: any = {
      "1": [
        {
          id: "t1",
          date: "2025-12-22",
          type: "Earned",
          description: "Purchase at Store A",
          points: "+250",
          status: "completed",
        },
        {
          id: "t2",
          date: "2025-12-20",
          type: "Redeemed",
          description: "10% Discount Voucher",
          points: "-500",
          status: "completed",
        },
        {
          id: "t3",
          date: "2025-12-15",
          type: "Earned",
          description: "Birthday Bonus",
          points: "+500",
          status: "completed",
        },
        {
          id: "t4",
          date: "2025-12-10",
          type: "Earned",
          description: "Purchase at Store B",
          points: "+150",
          status: "completed",
        },
      ],
      "2": [
        {
          id: "t5",
          date: "2025-12-23",
          type: "Earned",
          description: "Purchase at Store C",
          points: "+800",
          status: "completed",
        },
        {
          id: "t6",
          date: "2025-12-21",
          type: "Redeemed",
          description: "Free Delivery",
          points: "-150",
          status: "completed",
        },
        {
          id: "t7",
          date: "2025-12-18",
          type: "Earned",
          description: "Referral Bonus",
          points: "+200",
          status: "completed",
        },
        {
          id: "t8",
          date: "2025-12-12",
          type: "Earned",
          description: "Purchase at Store A",
          points: "+350",
          status: "completed",
        },
      ],
    };

    return (
      transactions[customerId] || [
        {
          id: "t_default",
          date: "2025-12-20",
          type: "Earned",
          description: "Purchase at Store",
          points: "+100",
          status: "completed",
        },
      ]
    );
  };

  const handleViewCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setViewMode("details");
  };

  const handleAwardPoints = async (purchaseAmount: number) => {
    if (!selectedCustomer?.contactId) {
      toast.error(t("Customer contact ID not found"));
      return;
    }

    try {
      await awardPointsMutation.mutateAsync({
        contactId: selectedCustomer.contactId,
        purchaseAmount,
      });
      toast.success(t("Points awarded successfully!"));
    } catch (error) {
      console.error("Error awarding points:", error);
    }
  };

  const handleUpdateCustomerStatus = async (
    status: "active" | "suspended" | "closed",
  ) => {
    if (!selectedCustomerId) {
      toast.error(t("Customer ID not found"));
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        customerId: selectedCustomerId,
        data: { status },
      });
      toast.success(t("Customer status updated successfully!"));
    } catch (error) {
      console.error("Error updating customer:", error);
    }
  };
  if (isLoading)
    return <div className="flex items-center justify-center py-8">loading</div>;
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
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={exportMutation.isPending}>
                  {exportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {t("Export Data")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportMutation.mutate("csv")}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t("Export as CSV")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportMutation.mutate("excel")}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {t("Export as Excel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by name or phone...")}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t("Filter")}
            </Button>
          </div>

          {/* Customers Table */}
          <DataTable columns={columns} data={customersData || []} />
        </div>
      ) : (
        selectedCustomer && (
          <div className="space-y-5">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => {
                setViewMode("list");
                setSelectedCustomerId(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("Back to Customers")}
            </Button>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <PremiumAvatar
                    name={selectedCustomer?.contact?.name || ""}
                    size="lg"
                  />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">
                      {selectedCustomer?.contact?.name}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{selectedCustomer?.contact?.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{selectedCustomer?.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Joined{" "}
                          {dayjs(selectedCustomer?.createdAt).format(
                            "MMMM D, YYYY",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedCustomer?.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Points Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      {t("Current Points")}
                    </p>
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {selectedCustomer?.currentPoints}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Available to redeem")}
                  </p>
                </CardContent>
              </Card>

              {/* Lifetime Points Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      {t("Lifetime Points")}
                    </p>
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedCustomer?.lifetimePoints}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Total earned")}
                  </p>
                </CardContent>
              </Card>

              {/* Tier Card */}
              <Card
                className={getTierCardClassName(
                  selectedCustomer?.tierColor || "",
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{t("Tier")}</p>
                    <UserCircle
                      className={getTierIconClassName(
                        selectedCustomer?.tierColor || "",
                      )}
                    />
                  </div>
                  <p
                    className={getTierTextClassName(
                      selectedCustomer?.tierColor || "",
                    )}
                  >
                    {t(selectedCustomer?.tier || "")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Member status")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => {
                  // You can add a modal or prompt here to get the purchase amount
                  const amount = prompt(t("Enter purchase amount:"));
                  if (amount && !Number.isNaN(Number(amount))) {
                    handleAwardPoints(Number(amount));
                  }
                }}
                disabled={awardPointsMutation.isPending}
              >
                <Award className="w-4 h-4 mr-2" />
                {awardPointsMutation.isPending
                  ? t("Awarding...")
                  : t("Add Points")}
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600">
                <Gift className="w-4 h-4 mr-2" />
                {t("Redeem Reward")}
              </Button>
            </div>

            {/* Transaction History */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("Transaction History")}
              </h3>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("Date")}
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("Type")}
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("Description")}
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("Points")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTransactionHistory(selectedCustomer?.id || "").map(
                        (transaction, index) => (
                          <tr
                            key={transaction.id}
                            className={`${index < getTransactionHistory(selectedCustomer?.id || "").length - 1 ? "border-b" : ""} hover:bg-muted/30 transition-colors`}
                          >
                            <td className="py-3 px-4">
                              <p className="text-sm">{transaction.date}</p>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  transaction.type === "Earned"
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 border border-green-500/20"
                                    : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20"
                                }
                              >
                                {t(transaction.type)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm">
                                {transaction.description}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-sm font-semibold ${
                                  transaction.points.startsWith("+")
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {transaction.points}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )
      )}
    </>
  );
};

export default CustomerPage;
