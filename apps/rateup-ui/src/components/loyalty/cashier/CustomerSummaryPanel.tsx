import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { PendingRedemption } from "@/backend/loyalty/cashier/cashier.api";
import { useCustomerRewardsByPhone } from "@/backend/loyalty/cashier/cashier.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useRedeemRewardByShortCode } from "@/backend/loyalty/redeems/redeems.query";
import { useApplyRedemption } from "@/backend/loyalty/redemption/redemption.query";
import { Loader } from "@/components/ui/loader.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { LOYALTY_PATHS } from "../../dashboard/loyalty/paths.ts";
import { CustomerView } from "./CustomerView.tsx";

/**
 * The same panel staff see, on the Customers page. Actions hand over to the cashier with
 * the customer already open — the counter is where money changes hands.
 */
export function CustomerSummaryPanel({ phone }: Readonly<{ phone: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const normalised = phone.replace(/\D/g, "");
  const { data, isLoading } = useCustomerRewardsByPhone(normalised);
  const { data: program } = useLoyaltyProgram();
  const apply = useApplyRedemption(normalised);
  const redeemShortCode = useRedeemRewardByShortCode();

  const onMarkUsed = async (pending: PendingRedemption) => {
    try {
      if (pending.kind === "redemption") await apply.mutateAsync({ redemptionCode: pending.code });
      else await redeemShortCode.mutateAsync(pending.code);
      toast.success(t("Marked as used"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not mark it as used")));
    }
  };

  if (isLoading) return <Loader />;
  if (!data)
    return (
      <p className="text-sm text-muted-foreground">{t("No loyalty account for this customer.")}</p>
    );

  return (
    <CustomerView
      data={data}
      orgId={user?.orgId}
      currencyCode={program?.currencyCode ?? "INR"}
      affordableCount={
        data.availableRewards.filter(
          (r) => r.pointsCost > 0 && r.pointsCost <= data.customer.currentPoints,
        ).length
      }
      onAction={(step) =>
        navigate({ to: LOYALTY_PATHS.cashier, search: { phone: normalised, step } })
      }
      onMarkUsed={onMarkUsed}
      markingUsed={apply.isPending || redeemShortCode.isPending}
      showFullHistory
    />
  );
}
