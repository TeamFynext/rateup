import { IconAddressBook, IconExternalLink, IconUserPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCreateApprovalRequest } from "@/backend/loyalty/approval/approval.query";
import type {
  CustomerReward,
  CustomerRewardsResponse,
  CustomerSearchResult,
  PendingRedemption,
} from "@/backend/loyalty/cashier/cashier.api";
import { useCustomerRewardsByPhone } from "@/backend/loyalty/cashier/cashier.query";
import {
  useAssignRewardMutation,
  useAwardPointsMutation,
  useCreateLoyaltyCustomerMutation,
} from "@/backend/loyalty/customer/customer.query";
import { useLoyaltyEarningRules } from "@/backend/loyalty/earningRules.query";
import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import { useEventTriggers } from "@/backend/loyalty/eventTriggers.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import {
  useRedeemReward,
  useRedeemRewardByShortCode,
} from "@/backend/loyalty/redeems/redeems.query";
import {
  useApplyRedemption,
  useVerifyRedemption,
} from "@/backend/loyalty/redemption/redemption.query";
import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query";
import { useLoyaltyTiers } from "@/backend/loyalty/tiers.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { TemplateType } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { LOYALTY_PATHS } from "../../dashboard/loyalty/paths.ts";
import { AddPurchaseForm } from "./AddPurchaseForm.tsx";
import type { Receipt as ReceiptData } from "./cashier.types.ts";
import { ContactPicker } from "./ContactPicker.tsx";
import { CouponCodeForm, lookupFromVerify, type CouponLookup } from "./CouponCodeForm.tsx";
import { CustomerSearch } from "./CustomerSearch.tsx";
import { CustomerView } from "./CustomerView.tsx";
import { GrantGiftForm } from "./GrantGiftForm.tsx";
import { buildWhatsAppPreview } from "./message-preview.ts";
import {
  NewCustomerForm,
  type NewCustomerPrefill,
  type NewCustomerValues,
} from "./NewCustomerForm.tsx";
import { estimateEarn } from "./points-estimate.ts";
import { Receipt } from "./Receipt.tsx";
import { servedInLastHour } from "./recentCustomers.ts";
import { RecentCustomers } from "./RecentCustomers.tsx";
import { RedeemList } from "./RedeemList.tsx";
import { useCashierNavigation } from "./useCashierNavigation.ts";
import { useRecentCustomers } from "./useRecentCustomers.ts";
import { WhatsAppBanner } from "./WhatsAppBanner.tsx";

/** `YYYY-MM-DD` in the picker's own time zone — what the API's `z.iso.date()` accepts. */
function toCalendarDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The counter. Search → customer → one action → receipt, with the three states that go
 * wrong (not found, not enough points, WhatsApp not connected) handled in place.
 *
 * One component for both routes. On a phone it shows one step at a time; from `md` up
 * the search and recents stay in a rail while the customer fills the rest.
 */
export function CashierPage({ standalone = false }: Readonly<{ standalone?: boolean }>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const nav = useCashierNavigation();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [prefill, setPrefill] = useState<NewCustomerPrefill>({});
  const [couponLookup, setCouponLookup] = useState<CouponLookup | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const { data: program, isLoading: programLoading } = useLoyaltyProgram();
  const {
    data: lookup,
    isLoading: lookupLoading,
    error: lookupError,
  } = useCustomerRewardsByPhone(nav.phone ?? "");
  const { data: rules = [] } = useLoyaltyEarningRules();
  const { data: tiers = [] } = useLoyaltyTiers();
  const { data: rewards = [] } = useLoyaltyRewards();
  const { data: triggers = [] } = useEventTriggers(program?.id ?? "");
  const { data: templates = [] } = useWaTemplates(TemplateType.LOYALTY);
  const { data: waSettings } = useWaSettings();
  const { recent, record } = useRecentCustomers(user?.orgId);

  const awardPoints = useAwardPointsMutation();
  const redeem = useRedeemReward(nav.phone ?? "");
  const assign = useAssignRewardMutation();
  const redeemShortCode = useRedeemRewardByShortCode();
  const verify = useVerifyRedemption();
  const apply = useApplyRedemption(nav.phone);
  const createCustomer = useCreateLoyaltyCustomerMutation();
  const requestCorrection = useCreateApprovalRequest();

  const pointsName = program?.currencyName ?? "Points";
  const currencySymbol = program?.currencySymbol ?? "₹";
  const currencyCode = program?.currencyCode ?? "INR";
  const waConnected = Boolean(waSettings?.length) && Boolean(program?.whatsappSettingsId);
  const tierNames = useMemo(() => new Map(tiers.map((tier) => [tier.id, tier.name])), [tiers]);

  const pointsPerVisit = useMemo(() => {
    const aov = program?.averageOrderValue;
    if (aov === null || aov === undefined) return null;
    return (
      estimateEarn({ amount: Number(aov), rules, tier: null, tiersEnabled: false })?.points ?? null
    );
  }, [program?.averageOrderValue, rules]);

  const affordableCount = (data: CustomerRewardsResponse) =>
    data.availableRewards.filter(
      (r) => r.pointsCost > 0 && r.pointsCost <= data.customer.currentPoints,
    ).length;

  const step = receipt ? "receipt" : nav.step;

  /* ── helpers ── */
  const receiptCustomer = (data: CustomerRewardsResponse) => ({
    id: data.customer.id,
    contactId: data.customer.contactId,
    name: data.customer.name,
    phone: data.customer.phone,
    tierName: data.customer.currentTier?.name ?? null,
  });

  const remember = (data: CustomerRewardsResponse, points = data.customer.currentPoints) =>
    record({
      ...receiptCustomer(data),
      points,
      servedAt: new Date().toISOString(),
      pendingCount: data.pendingRedemptions.length,
    });

  const openCustomer = (phone: string) => {
    setReceipt(null);
    nav.go("customer", phone.replace(/\D/g, ""));
  };

  const pickSearchResult = (result: CustomerSearchResult) => openCustomer(result.contact.phone);

  /* ── actions ── */
  const onAddPurchase = async (values: { amount: number; note?: string }) => {
    if (!lookup) return;
    try {
      const result = await awardPoints.mutateAsync({
        contactId: lookup.customer.contactId,
        purchaseAmount: values.amount,
        notes: values.note || undefined,
        channel: "in_store",
      });
      const data: ReceiptData = {
        kind: "earned",
        customer: receiptCustomer(lookup),
        before: lookup.customer.currentPoints,
        delta: result.pointsAwarded,
        after: result.customer.currentPoints,
        tierBefore: result.tier.previous,
        tierAfter: result.tier.current?.name ?? null,
        nextTierName: result.tier.next?.name ?? null,
        amountToNext: result.tier.amountToNext,
        amount: values.amount,
        note: values.note || undefined,
        event: LoyaltyEventType.POINTS_ISSUED,
        notification: result.notification,
      };
      remember(lookup, result.customer.currentPoints);
      setReceipt(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not add the purchase")));
    }
  };

  const onRedeem = async (reward: LoyaltyReward) => {
    if (!lookup) return;
    setRedeemingId(reward.id);
    try {
      const result = await redeem.mutateAsync({
        customerId: lookup.customer.id,
        rewardId: reward.id,
      });
      const pending = result.redemption?.status === "PENDING";
      const cost = pending ? 0 : reward.pointsCost;
      const code = (result as { shortCode?: string }).shortCode ?? result.redemptionCode;
      remember(lookup, lookup.customer.currentPoints - cost);
      setReceipt({
        kind: "redeemed",
        customer: receiptCustomer(lookup),
        before: lookup.customer.currentPoints,
        delta: -cost,
        after: lookup.customer.currentPoints - cost,
        tierBefore: lookup.customer.currentTier?.name ?? null,
        tierAfter: lookup.customer.currentTier?.name ?? null,
        nextTierName: lookup.tier.next?.name ?? null,
        amountToNext: lookup.tier.amountToNext,
        rewardName: reward.name,
        code: code ?? undefined,
        pendingApproval: pending,
        event: LoyaltyEventType.REWARD_REDEEMED,
        notification: null,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not redeem the reward")));
    } finally {
      setRedeemingId(null);
    }
  };

  const onGrant = async (gift: CustomerReward, note: string) => {
    if (!lookup) return;
    try {
      const result = await assign.mutateAsync({
        customerId: lookup.customer.id,
        rewardId: gift.id,
        notes: note || undefined,
      });
      remember(lookup);
      setReceipt({
        kind: "gift",
        customer: receiptCustomer(lookup),
        before: lookup.customer.currentPoints,
        delta: 0,
        after: lookup.customer.currentPoints,
        tierBefore: lookup.customer.currentTier?.name ?? null,
        tierAfter: lookup.customer.currentTier?.name ?? null,
        nextTierName: lookup.tier.next?.name ?? null,
        amountToNext: lookup.tier.amountToNext,
        rewardName: gift.name,
        code: result.data?.shortCode,
        event: LoyaltyEventType.REWARD_ISSUED,
        notification: null,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not grant the gift")));
    }
  };

  const onMarkUsed = async (pending: PendingRedemption) => {
    if (!lookup) return;
    try {
      if (pending.kind === "redemption") await apply.mutateAsync({ redemptionCode: pending.code });
      else await redeemShortCode.mutateAsync(pending.code);
      remember(lookup);
      setReceipt({
        kind: "coupon_used",
        customer: receiptCustomer(lookup),
        before: lookup.customer.currentPoints,
        delta: 0,
        after: lookup.customer.currentPoints,
        tierBefore: lookup.customer.currentTier?.name ?? null,
        tierAfter: lookup.customer.currentTier?.name ?? null,
        nextTierName: lookup.tier.next?.name ?? null,
        amountToNext: lookup.tier.amountToNext,
        rewardName: pending.reward?.name ?? t("Reward"),
        code: pending.code,
        event: LoyaltyEventType.REWARD_REDEEMED,
        notification: null,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not mark it as used")));
    }
  };

  const onCouponLookup = async (code: string) => {
    setCouponError(null);
    setCouponLookup(null);
    try {
      const response = await verify.mutateAsync(code);
      setCouponLookup(lookupFromVerify(code, response, t));
    } catch (error) {
      // Not a redemption code — perhaps an issued gift's short code, which lives elsewhere.
      const message = getApiErrorMessage(error, "");
      const own = lookup?.pendingRedemptions.find((p) => p.kind === "assigned" && p.code === code);
      if (own) {
        setCouponLookup({
          kind: "assigned",
          code,
          rewardName: own.reward?.name ?? t("Gift"),
          customerName: lookup?.customer.name ?? null,
          usable: true,
          reason: null,
          pointsCost: 0,
        });
      } else {
        setCouponError(message || t("No redemption with that code."));
      }
    }
  };

  const onCouponApply = async (found: CouponLookup) => {
    try {
      if (found.kind === "redemption") await apply.mutateAsync({ redemptionCode: found.code });
      else await redeemShortCode.mutateAsync(found.code);
      const customer = lookup
        ? receiptCustomer(lookup)
        : {
            id: "",
            contactId: "",
            name: found.customerName ?? t("Customer"),
            phone: nav.phone ?? "",
            tierName: null,
          };
      if (lookup) remember(lookup);
      setCouponLookup(null);
      setReceipt({
        kind: "coupon_used",
        customer,
        before: lookup?.customer.currentPoints ?? 0,
        delta: 0,
        after: lookup?.customer.currentPoints ?? 0,
        tierBefore: lookup?.customer.currentTier?.name ?? null,
        tierAfter: lookup?.customer.currentTier?.name ?? null,
        nextTierName: lookup?.tier.next?.name ?? null,
        amountToNext: lookup?.tier.amountToNext ?? null,
        rewardName: found.rewardName,
        code: found.code,
        event: LoyaltyEventType.REWARD_REDEEMED,
        notification: null,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not mark it as used")));
    }
  };

  const onRegister = async (values: NewCustomerValues) => {
    if (!user?.orgId || !program) return;
    const phone = values.phone.replace(/\D/g, "");
    try {
      const response = await createCustomer.mutateAsync({
        name: values.name,
        phone,
        orgId: user.orgId,
        // Sent as a calendar date, not `toISOString()`: a birthday picked as local midnight
        // would otherwise land on the previous day for anyone east of Greenwich.
        dob: values.dob ? toCalendarDate(values.dob) : undefined,
        gender: values.gender,
        referCode: values.referCode?.trim() || undefined,
        isPublic: false,
      });
      const created =
        (response as { data?: { id?: string; contactId?: string; currentPoints?: number } }).data ??
        {};
      const bonus = created.currentPoints ?? program.signupBonus ?? 0;
      record({
        id: created.id ?? phone,
        contactId: created.contactId ?? "",
        name: values.name,
        phone,
        tierName: null,
        points: bonus,
        servedAt: new Date().toISOString(),
        pendingCount: 0,
      });
      nav.go("customer", phone);
      setReceipt({
        kind: "joined",
        customer: {
          id: created.id ?? "",
          contactId: created.contactId ?? "",
          name: values.name,
          phone,
          tierName: null,
        },
        before: 0,
        delta: bonus,
        after: bonus,
        tierBefore: null,
        tierAfter: null,
        nextTierName: null,
        amountToNext: null,
        event: null,
        notification: null,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not register them")));
    }
  };

  /**
   * There is no endpoint that reverses a purchase, so Undo files a correction for
   * approval: the points come off once someone with the right to say so agrees — or at
   * once, when adjustments are auto-approved.
   */
  const onUndo = async () => {
    if (!receipt || receipt.kind !== "earned") return;
    try {
      await requestCorrection.mutateAsync({
        requestType: "POINTS_ADJUSTMENT",
        accountId: receipt.customer.id,
        points: -receipt.delta,
        reason: t("Undo purchase of {amount} recorded at the counter", {
          amount: receipt.amount ?? "",
        }),
        requestedByType: "STAFF",
        requestedBy: user?.userId ?? null,
        requestedByName: user?.userName ?? null,
      });
      toast.success(t("Sent to Activity › Pending for approval"));
      setReceipt(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("Could not request the correction")));
    }
  };

  if (programLoading) return <Loader />;
  if (!program) return null;

  const preview =
    receipt &&
    buildWhatsAppPreview({
      receipt,
      triggers,
      templates,
      waConnected,
      program: {
        status: program.status,
        whatsappNotifications: program.whatsappNotifications,
        pointsActivityAlerts: program.pointsActivityAlerts,
        pointsName,
      },
    });

  const rail = (
    <div className="flex flex-col gap-4">
      <CustomerSearch
        pointsName={pointsName}
        onPick={pickSearchResult}
        onRegister={(next) => {
          setPrefill(next);
          setReceipt(null);
          nav.go("new", null);
        }}
        autoFocus={step === "search"}
      />
      <Card className="border-border">
        <CardContent className="flex flex-col gap-2 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t("Add customer")}</p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-11 justify-start"
              onClick={() => {
                setPrefill({});
                setReceipt(null);
                nav.go("new", null);
              }}
            >
              <IconUserPlus size={18} />
              {t("New")}
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-start"
              onClick={() => {
                setReceipt(null);
                nav.go("contacts", null);
              }}
            >
              <IconAddressBook size={18} />
              {t("From Contacts")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {step === "search" && (
        <Button variant="ghost" className="justify-start" onClick={() => nav.go("coupon", null)}>
          {t("Coupon code")}
        </Button>
      )}
      <RecentCustomers
        recent={recent}
        pointsName={pointsName}
        onPick={(c) => openCustomer(c.phone)}
      />
    </div>
  );

  const main = (() => {
    if (step === "receipt" && receipt && preview) {
      return (
        <Receipt
          receipt={receipt}
          preview={preview}
          pointsName={pointsName}
          currencySymbol={currencySymbol}
          currencyCode={currencyCode}
          onNext={() => {
            setReceipt(null);
            nav.reset();
          }}
          onStay={() => {
            setReceipt(null);
            if (receipt.customer.phone) nav.go("customer", receipt.customer.phone);
          }}
          onUndo={receipt.kind === "earned" ? onUndo : undefined}
          undoing={requestCorrection.isPending}
        />
      );
    }
    if (step === "new") {
      return (
        <NewCustomerForm
          prefill={prefill}
          defaultCountry={program.defaultCountryCode ?? "IN"}
          signupBonus={program.signupBonus ?? 0}
          pointsName={pointsName}
          isSaving={createCustomer.isPending}
          programActive={program.status === "active"}
          onBack={() => nav.go("search", null)}
          onSubmit={onRegister}
          onOpenExisting={openCustomer}
        />
      );
    }
    if (step === "contacts") {
      return (
        <ContactPicker
          onBack={() => nav.go("search", null)}
          onPick={(contact) => {
            setPrefill({
              phone: contact.phone,
              name: contact.name ?? undefined,
              dob: contact.dob,
              gender: contact.gender,
            });
            nav.go("new", null);
          }}
          onOpenMember={openCustomer}
        />
      );
    }
    if (step === "coupon" && !lookup) {
      return (
        <CouponCodeForm
          isLooking={verify.isPending}
          isApplying={apply.isPending || redeemShortCode.isPending}
          lookup={couponLookup}
          lookupError={couponError}
          onBack={() => nav.go("search", null)}
          onLookup={onCouponLookup}
          onApply={onCouponApply}
        />
      );
    }
    if (!nav.phone) {
      return (
        <div className="hidden rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground md:block">
          {t("Search a customer, or register one on the spot.")}
        </div>
      );
    }
    if (lookupLoading) return <Loader />;
    if (lookupError || !lookup) {
      return (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-6">
          <p className="text-sm font-medium text-foreground">{t("Nobody on that number yet")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Register them now — it takes one field and the join bonus is automatic.")}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setPrefill({ phone: nav.phone });
                nav.go("new", null);
              }}
            >
              {t("Register {phone}", { phone: nav.phone })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => nav.reset()}>
              {t("Search again")}
            </Button>
          </div>
        </div>
      );
    }

    const customerTier = lookup.customer.currentTier
      ? {
          id: lookup.customer.currentTier.id,
          name: lookup.customer.currentTier.name,
          pointsMultiplier:
            lookup.tier.current?.pointsMultiplier ??
            tiers.find((tier) => tier.id === lookup.customer.currentTier?.id)?.pointsMultiplier ??
            1,
        }
      : null;

    switch (step) {
      case "purchase":
        return (
          <AddPurchaseForm
            customerName={lookup.customer.name}
            currentPoints={lookup.customer.currentPoints}
            currencySymbol={currencySymbol}
            currencyCode={currencyCode}
            pointsName={pointsName}
            rules={rules}
            tier={customerTier}
            tiersEnabled={program.tiersEnabled ?? true}
            rewardCosts={rewards
              .filter((r) => r.status === "ACTIVE" && r.pointsCost > 0)
              .map((r) => r.pointsCost)}
            isSaving={awardPoints.isPending}
            onBack={() => nav.go("customer")}
            onSubmit={onAddPurchase}
          />
        );
      case "redeem":
        return (
          <RedeemList
            customerName={lookup.customer.name}
            currentPoints={lookup.customer.currentPoints}
            pointsName={pointsName}
            catalogue={rewards}
            available={lookup.availableRewards}
            tierNames={tierNames}
            pointsPerVisit={pointsPerVisit}
            redeemingId={redeemingId}
            onBack={() => nav.go("customer")}
            onRedeem={onRedeem}
          />
        );
      case "coupon":
        return (
          <CouponCodeForm
            customerName={lookup.customer.name}
            isLooking={verify.isPending}
            isApplying={apply.isPending || redeemShortCode.isPending}
            lookup={couponLookup}
            lookupError={couponError}
            onBack={() => nav.go("customer")}
            onLookup={onCouponLookup}
            onApply={onCouponApply}
          />
        );
      case "gift":
        return (
          <GrantGiftForm
            customerName={lookup.customer.name}
            gifts={lookup.issuableRewards.filter((r) => r.rewardType === "assigned")}
            isSaving={assign.isPending}
            onBack={() => nav.go("customer")}
            onGrant={onGrant}
          />
        );
      default:
        return (
          <CustomerView
            data={lookup}
            orgId={user?.orgId}
            currencyCode={currencyCode}
            affordableCount={affordableCount(lookup)}
            onAction={(next) => {
              setCouponLookup(null);
              setCouponError(null);
              nav.go(next);
            }}
            onMarkUsed={onMarkUsed}
            markingUsed={apply.isPending || redeemShortCode.isPending}
            showFullHistory={!standalone}
          />
        );
    }
  })();

  const served = servedInLastHour(recent);

  return (
    <div className="flex flex-col gap-5">
      {!standalone && (
        <PageHeading
          title={t("Cashier")}
          description={
            lookup && step !== "search"
              ? served > 0
                ? t("{name} · served {count} customers this hour", {
                    name: lookup.customer.name,
                    count: served,
                  })
                : lookup.customer.name
              : t("Search a customer, or register one on the spot")
          }
          actions={
            <Button
              variant="ghost"
              size="sm"
              render={<a href={LOYALTY_PATHS.cashierStandalone} target="_blank" rel="noreferrer" />}
            >
              {t("Open full screen for staff")}
              <IconExternalLink size={14} />
            </Button>
          }
        />
      )}

      {!waConnected && <WhatsAppBanner pointsName={pointsName} standalone={standalone} />}

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={cn("min-w-0", step !== "search" && "hidden md:block")}>{rail}</aside>
        <section className={cn("min-w-0", step === "search" && "hidden md:block")}>{main}</section>
      </div>
    </div>
  );
}
