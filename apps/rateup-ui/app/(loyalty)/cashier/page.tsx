"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Award, Gift } from "lucide-react";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

import {
  useCustomerRewardsByPhone,
  useUseRedemption,
} from "@/backend/loyalty/cashier/cashier.query";
import { useAssignRewardMutation } from "@/backend/loyalty/customer/customer.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import {
  useGetRewardByShortCode,
  useRedeemReward,
  useRedeemRewardByShortCode,
} from "@/backend/loyalty/redeems/redeems.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { SessionAuthForNextJS } from "@/components/SuperToken/sessionAuthForNextJS";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { CashierHeader } from "./CashierHeader";
import { CashierProfile } from "./CashierProfile";
import {
  CashierEmptyState,
  CashierErrorState,
  CashierLoadingState,
} from "./CashierStates";
import { CashierTabsContent } from "./CashierTabsContent";

export default function CashierPortalPage() {
  return (
    <SessionAuthForNextJS>
      <CashierPortal />
    </SessionAuthForNextJS>
  );
}

enum CustomerRewardStatus {
  ISSUED = "ISSUED",
  REDEEMED = "REDEEMED",
}
function CashierPortal() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<
    string | null
  >(null);
  const [redemptionNote, setRedemptionNote] = useState("");
  const [actionDialog, setActionDialog] = useState<
    "redeem" | "assign" | "redeem_code" | null
  >(null);
  const [actionRewardId, setActionRewardId] = useState<string>("");
  const [actionNote, setActionNote] = useState("");

  // Short Code Redemption State
  const [shortCode, setShortCode] = useState("");
  const [codeReward, setCodeReward] = useState<any>(null);

  // React Query hooks
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useCustomerRewardsByPhone(searchPhone);
  const { data: programData, isPending } = useLoyaltyProgram();
  const { data: allRewards } = useGetLoyaltyRewards();

  const redeemMutation = useRedeemReward();
  const getRewardByCode = useGetRewardByShortCode();
  const redeemByCode = useRedeemRewardByShortCode();
  const useMutation = useUseRedemption(searchPhone);
  const assignRewardMutation = useAssignRewardMutation(() => {
    setActionDialog(null);
    setActionRewardId("");
    setActionNote("");
    queryClient.invalidateQueries({
      queryKey: ["loyalty-cashier-customer", searchPhone],
    });
    toast.success("Reward assigned successfully");
  });

  const handleSearch = () => {
    if (!phoneNumber || phoneNumber.length < 4) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setSearchPhone(phoneNumber?.replace("+", "") || "");
  };

  const confirmClaimReward = () => {
    if (!selectedRewardId || !searchPhone || !data?.customer?.id) return;

    redeemMutation.mutate(
      {
        customerId: data.customer.id,
        notes: redemptionNote,
        rewardId: selectedRewardId,
      },
      {
        onSuccess: () => {
          setSelectedRewardId(null);
          setRedemptionNote("");
          setSelectedRewardId(null);
          queryClient.invalidateQueries({
            queryKey: ["loyalty-cashier-customer", searchPhone],
          });
        },
      },
    );
  };

  const handleManualAssign = () => {
    if (!actionRewardId || !data?.customer?.id) return;

    assignRewardMutation.mutate({
      customerId: data.customer.id,
      rewardId: actionRewardId,
      notes: actionNote,
    });
  };

  const handleCheckCode = () => {
    if (!shortCode) return;
    getRewardByCode.mutate(shortCode, {
      onSuccess: (data) => setCodeReward(data),
      onError: () => {
        setCodeReward(null);
        toast.error("Invalid Code or Reward not found");
      },
    });
  };

  const handleRedeemCode = () => {
    if (!shortCode) return;
    redeemByCode.mutate(shortCode, {
      onSuccess: () => {
        setActionDialog(null);
        setShortCode("");
        setCodeReward(null);
        // Refresh customer data if we are looking at them
        if (searchPhone) {
          queryClient.invalidateQueries({
            queryKey: ["loyalty-cashier-customer", searchPhone],
          });
        }
      },
    });
  };

  const confirmUseRedemption = () => {
    if (!selectedRedemptionId) return;

    useMutation.mutate(
      { redemptionId: selectedRedemptionId },
      {
        onSuccess: () => {
          toast.success("Redemption marked as used!");
          setSelectedRedemptionId(null);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message ||
              "Failed to mark redemption as used",
          );
        },
      },
    );
  };

  // Filter redemptions
  const activeRedemptions =
    data?.redeemedRewards?.filter(
      (r) => r.status === "approved" || r.status === "pending",
    ) || [];
  const pastRedemptions =
    data?.redeemedRewards?.filter(
      (r: any) => r.status === "used" || r.status === "rejected",
    ) || [];

  const assignableRewards =
    allRewards?.filter((r) => r.rewardType === "assigned") || [];

  const loading = isLoading || isPending;

  return (
    <div className="min-h-screen flex flex-col">
      <CashierHeader
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        handleSearch={handleSearch}
        isLoading={loading}
        countryCode={programData?.defaultCountryCode}
      />

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 md:px-6 py-8 flex flex-col">
        {!data && !error && !loading && <CashierEmptyState />}

        {loading && <CashierLoadingState />}

        {error && <CashierErrorState error={error} />}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar - Customer Profile */}
            <div className="lg:col-span-3 space-y-4">
              <CashierProfile customer={data.customer} />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    setActionDialog("redeem_code");
                    setShortCode("");
                    setCodeReward(null);
                  }}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Code
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    setActionDialog("assign");
                    setActionRewardId("");
                  }}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Assign
                </Button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9 space-y-6">
              <CashierTabsContent
                data={data}
                activeRedemptions={activeRedemptions}
                pastRedemptions={pastRedemptions}
                onClaimReward={setSelectedRewardId}
                onUseRedemption={setSelectedRedemptionId}
                isClaiming={redeemMutation.isPending}
                selectedRewardId={selectedRewardId}
              />
            </div>
          </div>
        )}
      </div>

      {/* Manual Assign Dialog */}
      <Dialog
        open={actionDialog === "assign"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-600" />
              Assign Reward
            </DialogTitle>
            <DialogDescription>
              Assign a special/VIP reward to this customer without points cost.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Assigned Reward</Label>
              <Select value={actionRewardId} onValueChange={setActionRewardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reward to assign" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRewards.map((reward) => (
                    <SelectItem key={reward.id} value={reward.id}>
                      {reward.name}
                    </SelectItem>
                  ))}
                  {assignableRewards.length === 0 && (
                    <SelectItem value="none" disabled>
                      No assigned rewards available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea
                placeholder="Add a note..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleManualAssign}
              disabled={assignRewardMutation.isPending || !actionRewardId}
            >
              {assignRewardMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Reward Confirmation Dialog */}
      <AlertDialog
        open={selectedRewardId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRewardId(null);
            setRedemptionNote("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to redeem this reward? This will deduct
              <div className="space-y-2 py-4">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Add a note about this redemption..."
                  value={redemptionNote}
                  onChange={(e) => setRedemptionNote(e.target.value)}
                />
              </div>
              points immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClaimReward}
              className="bg-primary"
            >
              {redeemMutation.isPending ? "Processing..." : "Confirm & Redeem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Use Redemption Confirmation Dialog */}
      <AlertDialog
        open={selectedRedemptionId !== null}
        onOpenChange={(open) => !open && setSelectedRedemptionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Used?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that the customer has received their reward. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUseRedemption}
              className="bg-green-600 hover:bg-green-700"
            >
              {useMutation.isPending ? "Processing..." : "Mark as Used"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Redeem by Short Code Dialog */}
      <Dialog
        open={actionDialog === "redeem_code"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Redeem by Short Code
            </DialogTitle>
            <DialogDescription>
              Enter the 6-character code from the customer&apos;s reward card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Code (e.g., A1B2C3)"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-widest uppercase font-mono"
              />
              <Button
                onClick={handleCheckCode}
                disabled={getRewardByCode.isPending || shortCode.length < 6}
              >
                {getRewardByCode.isPending ? "Checking..." : "Check"}
              </Button>
            </div>

            {codeReward && (
              <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {codeReward.rewardName}
                    </h4>
                    <p className="text-sm text-slate-500">
                      Customer: {codeReward.customerName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {codeReward.customerPhone}
                    </p>
                  </div>
                  <Badge
                    variant={
                      codeReward.status === CustomerRewardStatus.ISSUED
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {codeReward.status?.toUpperCase()}
                  </Badge>
                </div>

                {codeReward.status === CustomerRewardStatus.ISSUED ? (
                  <div className="pt-2">
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={handleRedeemCode}
                      disabled={redeemByCode.isPending}
                    >
                      {redeemByCode.isPending
                        ? "Processing..."
                        : "Redeem Reward"}
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 text-center text-sm text-red-500 font-medium">
                    This code cannot be redeemed (Status: {codeReward.status})
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
