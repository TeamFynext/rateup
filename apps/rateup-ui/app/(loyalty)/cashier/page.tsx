"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

import {
  useCustomerRewardsByPhone,
  useUseRedemption,
} from "@/backend/loyalty/cashier/cashier.query";
import { useRedeemReward } from "@/backend/loyalty/redeems/redeems.query";
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
import { Label } from "@/components/ui/label";
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

function CashierPortal() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<
    string | null
  >(null);
  const [redemptionNote, setRedemptionNote] = useState("");
  // React Query hooks
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useCustomerRewardsByPhone(searchPhone);
  const redeemMutation = useRedeemReward();
  const useMutation = useUseRedemption(searchPhone);

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
      (r) => r.status === "used" || r.status === "rejected",
    ) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <CashierHeader
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        handleSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 md:px-6 py-8 flex flex-col">
        {!data && !error && !isLoading && <CashierEmptyState />}

        {isLoading && <CashierLoadingState />}

        {error && <CashierErrorState error={error} />}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar - Customer Profile */}
            <div className="lg:col-span-3 space-y-6">
              <CashierProfile customer={data.customer} />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9">
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
    </div>
  );
}
