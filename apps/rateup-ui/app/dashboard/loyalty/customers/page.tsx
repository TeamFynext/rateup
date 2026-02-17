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
  useAssignRewardMutation,
  useAwardPointsMutation,
  useExportCustomersMutation,
  useGetLoyaltyCustomerById,
  useLoyaltyCustomers,
  useUpdateLoyaltyCustomerMutation,
} from "@/backend/loyalty/customer/customer.query";
import { useRedeemReward } from "@/backend/loyalty/redeems/redeems.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumAvatar } from "@/components/ui/premium-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/UserContext";
import { formatDate } from "@/utils/dateTime";

type CustomerDetails = {
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
    tags: any;
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
    other: any | null;
    lifecycleId: string;
    closedAt: string | null;
    closedBy: string | null;
    lastMessageBody: any;
    lastMessageWaCreatedAt: string;
    lastMessagePlatform: string;
    lastReceivedMetadata: any | null;
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
};
const CustomerPage = () => {
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<"list" | "details">("list");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetails | null>(null);

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
  const [rewardForm, setRewardForm] = useState({
    reward: "",
    notes: "",
  });
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isAwardPointsOpen, setIsAwardPointsOpen] = useState(false);
  const [awardAmount, setAwardAmount] = useState("");

  // API Hooks
  const { data: customersData, isLoading } = useLoyaltyCustomers(
    pagination,
    searchTerm,
    sorting,
    [],
  );
  const { data: customerDetails } =
    useGetLoyaltyCustomerById(selectedCustomerId);
  const { data: allRewards } = useGetLoyaltyRewards();
  const awardPointsMutation = useAwardPointsMutation();
  const updateCustomerMutation = useUpdateLoyaltyCustomerMutation();
  const exportMutation = useExportCustomersMutation();
  const user = useUser();

  const redeemRewardMutation = useRedeemReward(
    selectedCustomer?.contact?.phone || "",
  );
  const assignRewardMutation = useAssignRewardMutation(() => {
    setIsRedeemOpen(false);
    setRewardForm({ reward: "", notes: "" });
  });

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

  const columns: ColumnDef<CustomerDetails>[] = [
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
      accessorKey: "contact.dob",
      id: "dob",
      header: "Date of Birth",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("dob")
            ? new Date(row.getValue("dob")).toLocaleDateString()
            : ""}
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

  const transactionColumns: ColumnDef<any>[] = [
    {
      accessorKey: "createdAt",
      header: t("Date"),
      cell: ({ row }) => (
        <p className="text-sm">{formatDate(row.getValue("createdAt"))}</p>
      ),
    },
    {
      accessorKey: "transactionType",
      header: t("Type"),
      cell: ({ row }) => (
        <Badge
          className={
            row.getValue("transactionType") === "earn"
              ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20"
          }
        >
          {row.getValue("transactionType")}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => (
        <p className="text-sm">{row.getValue("description")}</p>
      ),
    },
    {
      accessorKey: "points",
      header: () => <div className="text-right">{t("Points")}</div>,
      cell: ({ row }) => {
        const points = row.getValue<number>("points");
        return (
          <div className="text-right">
            <span
              className={`text-sm font-semibold ${
                points >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {points}
            </span>
          </div>
        );
      },
    },
  ];

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

  const handleRedeemReward = async () => {
    if (!selectedCustomerId || !rewardForm.reward) return;

    const reward = allRewards?.find((r) => r.id === rewardForm.reward);
    const isAssigned = reward?.rewardType === "assigned";

    try {
      if (isAssigned) {
        await assignRewardMutation.mutateAsync({
          rewardId: rewardForm.reward,
          notes: rewardForm.notes,
          customerId: selectedCustomerId,
        });
      } else {
        await redeemRewardMutation.mutateAsync({
          customerId: selectedCustomerId,
          rewardId: rewardForm.reward,
          notes: rewardForm.notes,
        });
        setIsRedeemOpen(false);
        setRewardForm({ reward: "", notes: "" });
      }
      toast.success(
        t(
          isAssigned
            ? "Reward assigned successfully!"
            : "Reward redeemed successfully!",
        ),
      );
    } catch (error) {
      console.error("Error redeeming/assigning reward:", error);
    }
  };

  // Filter available rewards (simplified logic: all active rewards)
  const availableRewards =
    allRewards?.filter((r) => r.status === "active") || [];

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
                        <span>{selectedCustomer?.contact?.email}</span>
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
                        <span>
                          {
                            // selectedCustomer?.contact?.other?.location ||
                          }
                        </span>
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
                  selectedCustomer?.currentTier?.color || "",
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{t("Tier")}</p>
                    <UserCircle
                      className={getTierIconClassName(
                        selectedCustomer?.currentTier?.color || "",
                      )}
                    />
                  </div>
                  <p
                    className={getTierTextClassName(
                      selectedCustomer?.currentTier?.color || "",
                    )}
                  >
                    {t(selectedCustomer?.currentTier?.name || "")}
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
                  setAwardAmount("");
                  setIsAwardPointsOpen(true);
                }}
                disabled={awardPointsMutation.isPending}
              >
                <Award className="w-4 h-4 mr-2" />
                {awardPointsMutation.isPending
                  ? t("Awarding...")
                  : t("Add Points")}
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                onClick={() => setIsRedeemOpen(true)}
              >
                <Gift className="w-4 h-4 mr-2" />
                {t("Redeem / Assign Reward")}
              </Button>
            </div>

            {/* Transaction History */}
            <div className="space-y-3 relative">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("Transaction History")}
              </h3>
              <DataTable
                columns={transactionColumns}
                data={customerDetails?.transactions || []}
              />
            </div>

            {/* Award Points Dialog */}
            <Dialog
              open={isAwardPointsOpen}
              onOpenChange={setIsAwardPointsOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("Award Points")}</DialogTitle>
                  <DialogDescription>
                    {t("Enter the purchase amount to calculate points.")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">{t("Purchase Amount")}</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={awardAmount}
                      onChange={(e) => setAwardAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && awardAmount) {
                          handleAwardPoints(Number(awardAmount));
                          setIsAwardPointsOpen(false);
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAwardPointsOpen(false)}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    onClick={() => {
                      if (awardAmount) {
                        handleAwardPoints(Number(awardAmount));
                        setIsAwardPointsOpen(false);
                      }
                    }}
                    disabled={!awardAmount || awardPointsMutation.isPending}
                  >
                    {awardPointsMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t("Confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Redeem Reward Dialog */}
            <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("Redeem or Assign Reward")}</DialogTitle>
                  <DialogDescription>
                    {t("Select a reward to give to this customer")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reward-select">{t("Select Reward")}</Label>
                    <Select
                      value={rewardForm.reward}
                      onValueChange={(value) =>
                        setRewardForm({ ...rewardForm, reward: value })
                      }
                    >
                      <SelectTrigger id="reward-select">
                        <SelectValue placeholder={t("Choose a reward")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRewards.map((reward) => (
                          <SelectItem key={reward.id} value={reward.id}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{reward.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {reward.rewardType === "assigned"
                                  ? t("(Assigned)")
                                  : t("({points} pts)", {
                                      points: reward.pointsCost,
                                    })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="redeem-notes">
                      {t("Notes (Optional)")}
                    </Label>
                    <Textarea
                      id="redeem-notes"
                      placeholder={t("Add any notes...")}
                      value={rewardForm.notes}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, notes: e.target.value })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsRedeemOpen(false)}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    onClick={handleRedeemReward}
                    disabled={
                      !rewardForm.reward ||
                      redeemRewardMutation.isPending ||
                      assignRewardMutation.isPending
                    }
                  >
                    {redeemRewardMutation.isPending ||
                    assignRewardMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("Processing...")}
                      </>
                    ) : (
                      t("Confirm")
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )
      )}
    </>
  );
};

export default CustomerPage;
