import { useQueryClient } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, View } from "react-native";

import { getCustomerRewardsByCardCode } from "@/api/loyalty/loyalty.api";
import { loyaltyKeys } from "@/api/loyalty/loyalty.keys";
import {
  useApplyRedemption,
  useAssignRewardMutation,
  useAwardPointsMutation,
  useCreateApprovalRequest,
  useCreateLoyaltyCustomer,
  useCustomerRewardsByPhone,
  useEventTriggers,
  useLoyaltyEarningRules,
  useLoyaltyProgram,
  useLoyaltyRewards,
  useLoyaltyTiers,
  useRedeemReward,
  useRedeemRewardByShortCode,
  useSendMemberCard,
  useVerifyRedemption,
} from "@/api/loyalty/loyalty.query";
import {
  LoyaltyEventType,
  type CustomerReward,
  type CustomerRewardsResponse,
  type CustomerSearchResult,
  type LoyaltyReward,
  type PendingRedemption,
} from "@/api/loyalty/loyalty.type";
import { useWaSettings, useWaTemplates } from "@/api/whatsapp/template/whatsapp.query";
import ScreenHeader from "@/components/common/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useCashierOutboxStore } from "@/store/cashierOutboxStore";
import { useCashierStore } from "@/store/cashierStore";
import { cacheCustomer, readCachedCustomer } from "@/utils/cashierOutbox/db";
import { accessDenialReason } from "@/utils/subscription";

import { AddPurchaseForm, type AddPurchaseValues } from "./AddPurchaseForm";
import { ContactPicker } from "./ContactPicker";
import { CouponCodeForm } from "./CouponCodeForm";
import { CustomerSearch } from "./CustomerSearch";
import { CustomerView } from "./CustomerView";
import { GrantGiftForm } from "./GrantGiftForm";
import { hapticError, hapticSuccess, hapticWarning } from "./haptics";
import { cardSendMessage } from "./logic/cardCode";
import { lookupFromVerify, type CouponLookup } from "./logic/cashier.coupon";
import type { Receipt as ReceiptData } from "./logic/cashier.types";
import { buildWhatsAppPreview } from "./logic/message-preview";
import { isUnreachable, responseStatus } from "./logic/network";
import { pendingDeltaFor, queueSummary, refusalFor, type OutboxItem } from "./logic/outbox";
import { estimateEarn } from "./logic/points-estimate";
import { signupBonusFor } from "./logic/signupBonus";
import {
  provisionalEarnReceipt,
  provisionalMarkUsedReceipt,
  reconcile,
} from "./logic/provisionalReceipt";
import { OutboxSheet } from "./OutboxSheet";
import {
  NewCustomerForm,
  type NewCustomerPrefill,
  type NewCustomerValues,
} from "./NewCustomerForm";
import { Receipt } from "./Receipt";
import { RedeemList } from "./RedeemList";
import { ScanCard } from "./ScanCard";
import {
  Badge,
  CenteredSpinner,
  CashierButton,
  EmptyState,
  StepBack,
  StepScroll,
  useTheme,
} from "./ui";
import { onSettle, useCashierOutbox } from "./useCashierOutbox";
import { useRecentCustomers } from "./useRecentCustomers";

/**
 * The counter. Search → customer → one action → receipt.
 *
 * A port of the web's `CashierPage`, with three differences that are structural rather than
 * cosmetic:
 *
 * - **One pane, not two.** The web's layout is a pure-CSS state machine
 *   (`md:grid-cols-[300px_1fr]` with `hidden md:block` on both panes). Native has no media
 *   queries, so the rail becomes the `search` step and the customer becomes every other one.
 * - **The step lives in a store, not the URL.** See `store/cashierStore.ts` for why not
 *   router params. It also drives Android's back button, which otherwise leaves the tab
 *   from the middle of a transaction.
 * - **Nothing toasts.** `Notice.tsx` cannot render above a native `Modal`, and this screen's
 *   predecessor reported every outcome from inside one — a redemption that 404'd looked
 *   exactly like a modal closing. Failures are held in `actionError` and rendered by the
 *   form that caused them; successes are the receipt.
 */
export default function CashierScreen() {
  const { t } = useTheme();
  const { orgId, userId } = useAuth();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const phone = useCashierStore((state) => state.phone);
  const rawStep = useCashierStore((state) => state.step);
  const receipt = useCashierStore((state) => state.receipt);
  const go = useCashierStore((state) => state.go);
  const openCustomerStep = useCashierStore((state) => state.openCustomer);
  const setReceipt = useCashierStore((state) => state.setReceipt);
  const back = useCashierStore((state) => state.back);
  const reset = useCashierStore((state) => state.reset);

  const [prefill, setPrefill] = useState<NewCustomerPrefill>({});
  const [couponLookup, setCouponLookup] = useState<CouponLookup | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [undoNote, setUndoNote] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [divergedFrom, setDivergedFrom] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cardNotice, setCardNotice] = useState<string | null>(null);
  /** The last server answer for this number, painted while the network is asked again. */
  const [cachedRow, setCached] = useState<{
    data: CustomerRewardsResponse;
    fetchedAt: number;
  } | null>(null);

  const { data: program, isLoading: programLoading } = useLoyaltyProgram();
  const {
    data: lookup,
    isLoading: lookupLoading,
    error: lookupError,
    refetch: refetchLookup,
  } = useCustomerRewardsByPhone(phone ?? "");
  const { data: rules = [] } = useLoyaltyEarningRules();
  const { data: tiers = [] } = useLoyaltyTiers();
  const { data: rewards = [] } = useLoyaltyRewards();
  const { data: triggers = [] } = useEventTriggers(program?.id);
  const { data: templates = [] } = useWaTemplates("LOYALTY");
  const { data: waSettings } = useWaSettings();
  const { recent, record } = useRecentCustomers(orgId);
  const { items: outbox, online } = useCashierOutbox(orgId, isFocused);
  const queueWrite = useCashierOutboxStore((state) => state.queue);
  const drainOutbox = useCashierOutboxStore((state) => state.drain);
  const discardQueued = useCashierOutboxStore((state) => state.discard);
  const releaseQueued = useCashierOutboxStore((state) => state.release);
  const setOnline = useCashierOutboxStore((state) => state.setOnline);

  const awardPoints = useAwardPointsMutation(phone ?? undefined);
  const redeem = useRedeemReward(phone ?? undefined);
  const assign = useAssignRewardMutation(phone ?? undefined);
  const redeemShortCode = useRedeemRewardByShortCode(phone ?? undefined);
  const verify = useVerifyRedemption();
  const apply = useApplyRedemption(phone ?? undefined);
  const createCustomer = useCreateLoyaltyCustomer();
  const requestCorrection = useCreateApprovalRequest(phone ?? undefined);
  const sendCard = useSendMemberCard(phone ?? undefined);

  const pointsName = program?.currencyName ?? "Points";
  const currencySymbol = program?.currencySymbol ?? "₹";
  const currencyCode = program?.currencyCode ?? "INR";
  // The endpoint returns a list, so a connected org has at least one row *and* the
  // programme has to be pointed at one of them.
  const waConnected =
    Array.isArray(waSettings) && waSettings.length > 0 && Boolean(program?.whatsappSettingsId);
  const tierNames = useMemo(() => new Map(tiers.map((tier) => [tier.id, tier.name])), [tiers]);

  /** What a typical visit earns, so an unaffordable reward can say "about 3 more visits". */
  const pointsPerVisit = useMemo(() => {
    const aov = program?.averageOrderValue;
    if (aov === null || aov === undefined) return null;
    return (
      estimateEarn({ amount: Number(aov), rules, tier: null, tiersEnabled: false })?.points ?? null
    );
  }, [program?.averageOrderValue, rules]);

  /**
   * The customer, from the cache when the network has not answered yet.
   *
   * The same thing `chat/[id].tsx` already does for a conversation: paint what we last
   * knew, then let the query overwrite it. The composed balance below is where the queue
   * meets the cache — a pending award's estimate is *added at read time* rather than
   * written into the cache, so provisional never gets persisted as truth.
   */
  // Whether a cached row is usable is a function of the current number, so it is derived
  // rather than blanked from the effect below — clearing state in an effect renders the
  // stale row once before the reset lands, which on this screen is another customer's
  // balance flashing up under the number just typed.
  const cacheable = Boolean(orgId) && (phone?.length ?? 0) >= 10;
  const cached = cacheable ? cachedRow : null;

  const served = lookup ?? cached?.data;
  const pendingDelta = served ? pendingDeltaFor(outbox, served.customer.id) : 0;
  const balanceAsOf = new Date(lookup ? Date.now() : (cached?.fetchedAt ?? Date.now()));

  useEffect(() => {
    if (!orgId || !phone || !cacheable) return;
    let cancelled = false;
    void readCachedCustomer<CustomerRewardsResponse>(orgId, phone).then((row) => {
      if (!cancelled && row) setCached(row);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, phone, cacheable]);

  // Every completed request is evidence the API is reachable, and a failure with no
  // response is evidence it is not. That is the only definition of "offline" the queue
  // cares about — a connectivity API would report "connected" behind a captive portal.
  useEffect(() => {
    if (!orgId || !phone || !lookup) return;
    setOnline(true);
    void cacheCustomer(orgId, phone, lookup);
  }, [orgId, phone, lookup, setOnline]);

  // A queued write that settles while its receipt is still on screen replaces the
  // estimate with the real figures — loudly when they differ, because that divergence is
  // the whole reason a provisional receipt is dangerous.
  useEffect(() => {
    const unsubscribe = onSettle((event) => {
      // `unresolved` means the request did *not* reach the server, so it is not evidence
      // of reachability — the other two are.
      if (event.status === "done" || event.status === "failed") setOnline(true);
      const current = useCashierStore.getState().receipt;
      if (!current?.clientRef || current.clientRef !== event.item.id) return;
      if (event.status !== "done" || !event.confirmed) return;
      const { receipt: next, diverged } = reconcile(current, {
        delta: event.confirmed.points,
        after: event.confirmed.balanceAfter,
      });
      setReceipt(next);
      setDivergedFrom(diverged ? current.delta : null);
      if (diverged) hapticWarning();
      else hapticSuccess();
    });
    return () => {
      unsubscribe();
    };
  }, [setReceipt, setOnline]);

  const step = receipt ? "receipt" : rawStep;

  // Android's back button. Only while this tab is focused, or it would intercept the
  // gesture from whichever screen is actually on top.
  useEffect(() => {
    if (!isFocused) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const handled = back();
      if (handled) clearErrors();
      return handled;
    });
    return () => subscription.remove();
  }, [isFocused, back]);

  function clearErrors() {
    setActionError(null);
    setCouponError(null);
    setUndoNote(null);
    setScanError(null);
    setCardNotice(null);
  }

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

  const openCustomer = (next: string) => {
    clearErrors();
    setCouponLookup(null);
    openCustomerStep(next);
  };

  const affordableCount = (data: CustomerRewardsResponse) =>
    data.availableRewards.filter(
      (reward) => reward.pointsCost > 0 && reward.pointsCost <= data.customer.currentPoints,
    ).length;

  const fail = (error: unknown, fallback: string) => {
    if (isUnreachable(error)) setOnline(false);
    hapticError();
    setActionError(apiErrorMessage(error, fallback));
  };

  /**
   * The counter refuses rather than queues.
   *
   * `redeem` spends the balance against stock and per-customer caps no client can see, and
   * its code is minted server-side — so a replay after an ambiguous outcome could not even
   * be *verified*, let alone deduped. `register` allocates the id the next screen needs.
   * Both are stated with what does still work, because "come back when there is signal" is
   * how a sale is lost.
   */
  const refuse = (action: "redeem" | "register") => {
    setOnline(false);
    hapticWarning();
    setActionError(refusalFor(action, pointsName));
  };

  /** The context every queued row carries, so the outbox renders with no network. */
  const outboxContext = (data: CustomerRewardsResponse) => ({
    accountId: data.customer.id,
    contactId: data.customer.contactId,
    phone: data.customer.phone,
    customerName: data.customer.name,
    tierName: data.customer.currentTier?.name ?? null,
    balanceBefore: data.customer.currentPoints,
    balanceAsOf: balanceAsOf.toISOString(),
  });

  const succeed = (data: ReceiptData) => {
    hapticSuccess();
    setActionError(null);
    setUndoNote(null);
    setDivergedFrom(null);
    setReceipt(data);
  };

  /* ── actions ── */

  const onAddPurchase = async (values: AddPurchaseValues) => {
    // The purchase can be taken against the cached customer — it is the one action a
    // counter cannot afford to lose, and it is purely additive, so two devices awarding
    // the same person both succeed and both are right.
    const data = served;
    if (!data) return;
    setActionError(null);
    try {
      const result = await awardPoints.mutateAsync({
        contactId: data.customer.contactId,
        purchaseAmount: values.amount,
        notes: values.note,
        channel: "in_store",
      });
      setOnline(true);
      remember(data, result.customer.currentPoints);
      succeed({
        kind: "earned",
        customer: receiptCustomer(data),
        before: data.customer.currentPoints,
        delta: result.pointsAwarded,
        after: result.customer.currentPoints,
        tierBefore: result.tier.previous,
        tierAfter: result.tier.current?.name ?? null,
        nextTierName: result.tier.next?.name ?? null,
        amountToNext: result.tier.amountToNext,
        amount: values.amount,
        note: values.note,
        event: LoyaltyEventType.POINTS_ISSUED,
        notification: result.notification,
      });
    } catch (error) {
      // Only a request that never reached the server is queued. A rejection means the
      // server read it and said no, and retrying that just gets the same answer.
      if (!isUnreachable(error) || !orgId) {
        fail(error, "Could not add the purchase");
        return;
      }
      await queueEarn(data, values);
    }
  };

  /**
   * Takes the purchase for later, and shows a receipt that says as much.
   *
   * The estimate is what makes this possible at all — `points-estimate.ts` mirrors the
   * server's rules engine, so there is a number to read out. It is labelled an estimate
   * everywhere it appears, because the two can legitimately differ: the estimator
   * deliberately models neither per-customer usage caps nor the JSON `conditions` column.
   */
  const queueEarn = async (data: CustomerRewardsResponse, values: AddPurchaseValues) => {
    if (!orgId) return;
    const tier = data.customer.currentTier
      ? { pointsMultiplier: data.tier.current?.pointsMultiplier ?? 1 }
      : null;
    const estimate = estimateEarn({
      amount: values.amount,
      rules,
      tier,
      tiersEnabled: program?.tiersEnabled ?? true,
      tierId: data.customer.currentTier?.id,
    });
    if (!estimate) {
      setOnline(false);
      fail(null, "No connection, and no earning rule to work the points out from.");
      return;
    }

    const clientRef = await queueWrite({
      orgId,
      kind: "award",
      payload: {
        contactId: data.customer.contactId,
        purchaseAmount: values.amount,
        notes: values.note,
        channel: "in_store",
      },
      context: {
        ...outboxContext(data),
        estimatedPoints: estimate.points,
        basePoints: estimate.basePoints,
        ruleName: estimate.rule.name,
        purchaseAmount: values.amount,
        note: values.note,
      },
    });

    setOnline(false);
    // Not the server's number, so the recents row keeps the last known balance and shows
    // the queued delta separately — see `pendingDeltaFor`.
    remember(data);
    hapticSuccess();
    setActionError(null);
    setDivergedFrom(null);
    setReceipt(
      provisionalEarnReceipt({
        customer: receiptCustomer(data),
        clientRef,
        estimate,
        balanceBefore: data.customer.currentPoints,
        balanceAsOf: balanceAsOf.toISOString(),
        amount: values.amount,
        note: values.note,
      }),
    );
  };

  const onRedeem = async (reward: LoyaltyReward) => {
    // Attempted against the cached customer, so the refusal comes from the *request*
    // failing rather than from a guess about connectivity — a captive portal reports
    // "connected", and only a real outcome settles it.
    const data = served;
    if (!data) return;
    setActionError(null);
    setRedeemingId(reward.id);
    try {
      const result = await redeem.mutateAsync({
        customerId: data.customer.id,
        rewardId: reward.id,
      });
      // Nothing is spent until it is approved, so a pending redemption moves no balance.
      const pending = result.redemption?.status === "PENDING";
      const cost = pending ? 0 : reward.pointsCost;
      const code = (result as { shortCode?: string }).shortCode ?? result.redemptionCode;
      remember(data, data.customer.currentPoints - cost);
      succeed({
        kind: "redeemed",
        customer: receiptCustomer(data),
        before: data.customer.currentPoints,
        delta: -cost,
        after: data.customer.currentPoints - cost,
        tierBefore: data.customer.currentTier?.name ?? null,
        tierAfter: data.customer.currentTier?.name ?? null,
        nextTierName: data.tier.next?.name ?? null,
        amountToNext: data.tier.amountToNext,
        rewardName: reward.name,
        code: code ?? undefined,
        pendingApproval: pending,
        event: LoyaltyEventType.REWARD_REDEEMED,
        notification: null,
      });
    } catch (error) {
      // Refused rather than queued — see `refuse`.
      if (isUnreachable(error)) refuse("redeem");
      else fail(error, "Could not redeem the reward");
    } finally {
      setRedeemingId(null);
    }
  };

  const onGrant = async (gift: CustomerReward, note: string) => {
    const data = served;
    if (!data) return;
    setActionError(null);
    try {
      const result = await assign.mutateAsync({
        customerId: data.customer.id,
        rewardId: gift.id,
        notes: note || undefined,
      });
      remember(data);
      succeed({
        kind: "gift",
        customer: receiptCustomer(data),
        before: data.customer.currentPoints,
        delta: 0,
        after: data.customer.currentPoints,
        tierBefore: data.customer.currentTier?.name ?? null,
        tierAfter: data.customer.currentTier?.name ?? null,
        nextTierName: data.tier.next?.name ?? null,
        amountToNext: data.tier.amountToNext,
        rewardName: gift.name,
        code: result.data?.shortCode,
        event: LoyaltyEventType.REWARD_ISSUED,
        notification: null,
      });
    } catch (error) {
      fail(error, "Could not grant the gift");
    }
  };

  const onMarkUsed = async (pending: PendingRedemption) => {
    const data = served;
    if (!data) return;
    setActionError(null);
    try {
      if (pending.kind === "redemption") await apply.mutateAsync({ redemptionCode: pending.code });
      else await redeemShortCode.mutateAsync(pending.code);
      setOnline(true);
      remember(data);
      succeed({
        kind: "coupon_used",
        customer: receiptCustomer(data),
        before: data.customer.currentPoints,
        delta: 0,
        after: data.customer.currentPoints,
        tierBefore: data.customer.currentTier?.name ?? null,
        tierAfter: data.customer.currentTier?.name ?? null,
        nextTierName: data.tier.next?.name ?? null,
        amountToNext: data.tier.amountToNext,
        rewardName: pending.reward?.name ?? "Reward",
        code: pending.code,
        event: LoyaltyEventType.REWARD_REDEEMED,
        notification: null,
      });
    } catch (error) {
      if (!isUnreachable(error) || !orgId) {
        fail(error, "Could not mark it as used");
        return;
      }
      // Queued, because marking used moves no balance and a replay is *success-equivalent*:
      // the server refuses a duplicate with "already applied" / "already redeemed", which
      // means the world is already how we wanted it. The reward can be handed over now.
      const clientRef = await queueWrite({
        orgId,
        kind: pending.kind === "redemption" ? "apply_redemption" : "redeem_shortcode",
        payload:
          pending.kind === "redemption"
            ? { redemptionCode: pending.code }
            : { shortCode: pending.code },
        context: { ...outboxContext(data), rewardName: pending.reward?.name ?? "Reward" },
      });
      setOnline(false);
      remember(data);
      hapticSuccess();
      setActionError(null);
      setDivergedFrom(null);
      setReceipt(
        provisionalMarkUsedReceipt({
          customer: receiptCustomer(data),
          clientRef,
          rewardName: pending.reward?.name ?? "Reward",
          code: pending.code,
          balanceBefore: data.customer.currentPoints,
          balanceAsOf: balanceAsOf.toISOString(),
        }),
      );
    }
  };

  const onCouponLookup = async (code: string) => {
    setCouponError(null);
    setCouponLookup(null);
    try {
      setCouponLookup(lookupFromVerify(code, await verify.mutateAsync(code)));
    } catch (error) {
      // Not a redemption code — perhaps an issued gift's short code, which lives elsewhere
      // and has no verify endpoint of its own, so the open customer's pending list is the
      // only place to recognise it.
      const own = served?.pendingRedemptions.find(
        (item) => item.kind === "assigned" && item.code === code,
      );
      if (own) {
        setCouponLookup({
          kind: "assigned",
          code,
          rewardName: own.reward?.name ?? "Gift",
          customerName: served?.customer.name ?? null,
          usable: true,
          reason: null,
          pointsCost: 0,
        });
      } else {
        hapticWarning();
        setCouponError(apiErrorMessage(error, "No redemption with that code."));
      }
    }
  };

  const onCouponApply = async (found: CouponLookup) => {
    setCouponError(null);
    try {
      if (found.kind === "redemption") await apply.mutateAsync({ redemptionCode: found.code });
      else await redeemShortCode.mutateAsync(found.code);
      // The code can belong to someone who is not the open customer — a coupon read off a
      // WhatsApp message with nobody looked up at all — so the receipt falls back to the
      // name the lookup gave.
      const customer = served
        ? receiptCustomer(served)
        : {
            id: "",
            contactId: "",
            name: found.customerName ?? "Customer",
            phone: phone ?? "",
            tierName: null,
          };
      if (served) remember(served);
      setCouponLookup(null);
      succeed({
        kind: "coupon_used",
        customer,
        before: served?.customer.currentPoints ?? 0,
        delta: 0,
        after: served?.customer.currentPoints ?? 0,
        tierBefore: served?.customer.currentTier?.name ?? null,
        tierAfter: served?.customer.currentTier?.name ?? null,
        nextTierName: served?.tier.next?.name ?? null,
        amountToNext: served?.tier.amountToNext ?? null,
        rewardName: found.rewardName,
        code: found.code,
        event: LoyaltyEventType.REWARD_REDEEMED,
        notification: null,
      });
    } catch (error) {
      hapticError();
      setCouponError(apiErrorMessage(error, "Could not mark it as used"));
    }
  };

  const onRegister = async (values: NewCustomerValues) => {
    // `orgId` is in the guard because the endpoint's body schema requires it: without one
    // the enrolment comes back 400, which reads at the counter as the form simply refusing.
    if (!program || !orgId) return;
    setActionError(null);
    try {
      const response = await createCustomer.mutateAsync({
        orgId,
        name: values.name,
        phone: values.phone,
        // A calendar date, never `toISOString()`: local midnight east of Greenwich
        // serialises to the previous day, and the birthday message then goes out early.
        dob: values.dob,
        gender: values.gender,
        referCode: values.referCode,
      });
      const created =
        (response as { data?: { id?: string; contactId?: string; currentPoints?: number } }).data ??
        response;
      const bonus = created.currentPoints ?? signupBonusFor(program);
      record({
        id: created.id ?? values.phone,
        contactId: created.contactId ?? "",
        name: values.name,
        phone: values.phone,
        tierName: null,
        points: bonus,
        servedAt: new Date().toISOString(),
        pendingCount: 0,
      });
      go("customer", values.phone);
      succeed({
        kind: "joined",
        customer: {
          id: created.id ?? "",
          contactId: created.contactId ?? "",
          name: values.name,
          phone: values.phone,
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
      // Refused rather than queued: the account id and referral code the next screen needs
      // are allocated server-side, and `award-points` takes a `contactId` that would not
      // exist yet — so a queued enrolment could have nothing chained behind it anyway.
      if (isUnreachable(error)) refuse("register");
      else fail(error, "Could not register them");
    }
  };

  /**
   * There is no endpoint that reverses a purchase, so Undo files a correction for approval:
   * the points come off once someone with the right to say so agrees — or at once, when
   * adjustments are auto-approved. The receipt stays put and says so, because the customer
   * is still standing there.
   */
  const onUndo = async () => {
    if (!receipt || receipt.kind !== "earned") return;

    /*
     * A queued award has not happened yet, so Undo simply deletes the row — a *true* undo,
     * and a better one than the web's, which has no endpoint that reverses a purchase and
     * therefore has to file an adjustment for someone to approve.
     */
    if (receipt.provisional && receipt.clientRef) {
      await discardQueued(receipt.clientRef);
      hapticSuccess();
      setReceipt(null);
      setDivergedFrom(null);
      return;
    }

    try {
      await requestCorrection.mutateAsync({
        requestType: "POINTS_ADJUSTMENT",
        accountId: receipt.customer.id,
        points: -receipt.delta,
        reason: `Undo purchase of ${receipt.amount ?? ""} recorded at the counter`,
        requestedByType: "STAFF",
        requestedByName: userId ?? null,
      });
      hapticSuccess();
      setUndoNote("Sent for approval — the points come off once it is approved.");
    } catch (error) {
      hapticError();
      setActionError(apiErrorMessage(error, "Could not request the correction"));
    }
  };

  /**
   * A scanned (or typed) card. The lookup answers with the same payload as the phone
   * lookup, so it is seeded into that query's cache under the phone the store will
   * normalise to, and the ordinary `openCustomer` takes it from there — the customer view,
   * every action, the outbox and the recents all keep working off the phone as before.
   */
  const resolveCard = async (code: string) => {
    if (scanning) return;
    setScanError(null);
    setScanning(true);
    try {
      const data = await getCustomerRewardsByCardCode(code);
      setOnline(true);
      queryClient.setQueryData(
        loyaltyKeys.cashierCustomer(data.customer.phone.replace(/\D/g, "")),
        data,
      );
      hapticSuccess();
      openCustomer(data.customer.phone);
    } catch (error) {
      hapticWarning();
      if (isUnreachable(error)) {
        setOnline(false);
        setScanError("Scanning needs a connection — search by name or number instead.");
      } else if (responseStatus(error) === 404) {
        setScanError("Not a card from this programme.");
      } else {
        setScanError(apiErrorMessage(error, "Could not read this card"));
      }
    } finally {
      setScanning(false);
    }
  };

  const onSendCard = async () => {
    const data = served;
    if (!data) return;
    setCardNotice(null);
    try {
      const outcome = await sendCard.mutateAsync(data.customer.id);
      if (outcome.sent) hapticSuccess();
      else hapticWarning();
      setCardNotice(cardSendMessage(outcome));
    } catch (error) {
      hapticError();
      setCardNotice(apiErrorMessage(error, "Could not send the card"));
    }
  };

  /* ── render ── */

  const preview =
    receipt && program
      ? buildWhatsAppPreview({
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
        })
      : null;

  const body = (() => {
    if (programLoading) {
      return (
        <StepScroll>
          <CenteredSpinner />
        </StepScroll>
      );
    }
    if (!program) {
      return (
        <StepScroll>
          <EmptyState
            title="No loyalty programme yet"
            body="Set one up on the web dashboard, then the counter opens here."
          />
        </StepScroll>
      );
    }

    if (step === "receipt" && receipt && preview) {
      return (
        <Receipt
          receipt={receipt}
          preview={preview}
          pointsName={pointsName}
          currencySymbol={currencySymbol}
          currencyCode={currencyCode}
          onNext={() => {
            clearErrors();
            reset();
          }}
          onStay={() => {
            clearErrors();
            if (receipt.customer.phone) openCustomer(receipt.customer.phone);
            else reset();
          }}
          onUndo={receipt.kind === "earned" ? onUndo : undefined}
          undoing={requestCorrection.isPending}
          undoNote={undoNote}
          divergedFrom={divergedFrom}
        />
      );
    }

    if (step === "scan") {
      return (
        <ScanCard
          active={isFocused}
          resolving={scanning}
          error={scanError}
          onCode={(code) => void resolveCard(code)}
          onBack={() => {
            clearErrors();
            go("search", null);
          }}
        />
      );
    }

    if (step === "search") {
      return (
        <CustomerSearch
          pointsName={pointsName}
          recent={recent}
          onPick={(result: CustomerSearchResult) => openCustomer(result.contact.phone)}
          onRegister={(next) => {
            clearErrors();
            setPrefill(next);
            go("new", null);
          }}
          onPickRecent={(customer) => openCustomer(customer.phone)}
          pendingFor={(customer) => pendingDeltaFor(outbox, customer.id)}
          onFromContacts={() => {
            clearErrors();
            go("contacts", null);
          }}
          onCoupon={() => {
            clearErrors();
            setCouponLookup(null);
            go("coupon", null);
          }}
          onScan={() => {
            clearErrors();
            go("scan", null);
          }}
          onCardCode={(code) => void resolveCard(code)}
        />
      );
    }

    if (step === "new") {
      return (
        <NewCustomerForm
          prefill={prefill}
          defaultCountry={program.defaultCountryCode ?? "IN"}
          signupBonus={signupBonusFor(program)}
          pointsName={pointsName}
          isSaving={createCustomer.isPending}
          programActive={program.status === "active"}
          error={actionError}
          onSubmit={onRegister}
          onOpenExisting={openCustomer}
        />
      );
    }

    if (step === "contacts") {
      return (
        <ContactPicker
          onPick={(contact) => {
            setPrefill({
              phone: contact.phone,
              name: contact.name ?? undefined,
              dob: contact.dob,
              gender: contact.gender,
            });
            go("new", null);
          }}
          onOpenMember={openCustomer}
        />
      );
    }

    // The coupon form is the one action reachable with nobody open — a code can be read off
    // a customer's phone before anyone has been looked up.
    if (step === "coupon" && !served) {
      return (
        <CouponCodeForm
          isLooking={verify.isPending}
          isApplying={apply.isPending || redeemShortCode.isPending}
          lookup={couponLookup}
          lookupError={couponError}
          onLookup={onCouponLookup}
          onApply={onCouponApply}
        />
      );
    }

    if (!phone) return null;
    // The cache paints first, so a spinner only appears the very first time this number is
    // looked up on this device.
    if (lookupLoading && !served) return <CenteredSpinner />;
    if (!served) {
      // "Nobody on that number" is only true if the server said so. With no cache and no
      // connection we do not know, and offering to register someone who may already be a
      // member is how a duplicate account gets made.
      if (isUnreachable(lookupError)) {
        return (
          <EmptyState
            title="Can't reach the server"
            body="This number has not been looked up on this phone before, so there is nothing saved to show. Try again when there is signal."
          >
            <View style={{ gap: 8, marginTop: 4 }}>
              <CashierButton label="Try again" compact onPress={() => void refetchLookup()} />
              <CashierButton label="Search again" variant="ghost" compact onPress={reset} />
            </View>
          </EmptyState>
        );
      }
      return (
        <EmptyState
          title="Nobody on that number yet"
          body="Register them now — it takes one field and the join bonus is automatic."
        >
          <View style={{ gap: 8, marginTop: 4 }}>
            <CashierButton
              label={`Register ${phone}`}
              compact
              onPress={() => {
                setPrefill({ phone });
                go("new", null);
              }}
            />
            <CashierButton label="Search again" variant="ghost" compact onPress={reset} />
          </View>
        </EmptyState>
      );
    }

    const customerTier = served.customer.currentTier
      ? {
          id: served.customer.currentTier.id,
          name: served.customer.currentTier.name,
          pointsMultiplier:
            served.tier.current?.pointsMultiplier ??
            tiers.find((tier) => tier.id === served.customer.currentTier?.id)?.pointsMultiplier ??
            1,
        }
      : null;

    switch (step) {
      case "purchase":
        return (
          <AddPurchaseForm
            customerName={served.customer.name}
            currentPoints={served.customer.currentPoints}
            currencySymbol={currencySymbol}
            currencyCode={currencyCode}
            pointsName={pointsName}
            rules={rules}
            tier={customerTier}
            tiersEnabled={program.tiersEnabled ?? true}
            rewardCosts={rewards
              .filter((reward) => reward.status === "ACTIVE" && reward.pointsCost > 0)
              .map((reward) => reward.pointsCost)}
            isSaving={awardPoints.isPending}
            error={actionError}
            onSubmit={onAddPurchase}
          />
        );
      case "redeem":
        return (
          <RedeemList
            customerName={served.customer.name}
            currentPoints={served.customer.currentPoints}
            pointsName={pointsName}
            catalogue={rewards}
            available={served.availableRewards}
            tierNames={tierNames}
            pointsPerVisit={pointsPerVisit}
            redeemingId={redeemingId}
            error={actionError}
            online={online}
            onRedeem={onRedeem}
          />
        );
      case "coupon":
        return (
          <CouponCodeForm
            customerName={served.customer.name}
            isLooking={verify.isPending}
            isApplying={apply.isPending || redeemShortCode.isPending}
            lookup={couponLookup}
            lookupError={couponError}
            onLookup={onCouponLookup}
            onApply={onCouponApply}
          />
        );
      case "gift":
        return (
          <GrantGiftForm
            customerName={served.customer.name}
            gifts={served.issuableRewards.filter((reward) => reward.rewardType === "assigned")}
            isSaving={assign.isPending}
            error={actionError}
            onGrant={onGrant}
          />
        );
      default:
        return (
          <CustomerView
            data={served}
            currencyCode={currencyCode}
            affordableCount={affordableCount(served)}
            pendingDelta={pendingDelta}
            balanceAsOf={lookup ? null : balanceAsOf.toISOString()}
            onAction={(next) => {
              clearErrors();
              setCouponLookup(null);
              go(next);
            }}
            onMarkUsed={onMarkUsed}
            markingUsed={apply.isPending || redeemShortCode.isPending}
            error={actionError}
            onSendCard={() => void onSendCard()}
            sendingCard={sendCard.isPending}
            cardNotice={cardNotice}
          />
        );
    }
  })();

  const summary = queueSummary(outbox, online);

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader
        title={headerTitle(step, served)}
        actions={
          // Always visible while there is anything to say, on every step: a refusal must
          // never be the first time staff learn there is no network.
          summary ? (
            <Pressable onPress={() => setOutboxOpen(true)} hitSlop={8}>
              <Badge
                label={summary.label}
                tone={summary.tone === "danger" ? "warm" : summary.tone}
              />
            </Pressable>
          ) : undefined
        }
      />
      {/* Every step but the first has somewhere to go back to. It sits here, above the
          step, rather than in the bar — same control on both platforms, and the bar keeps
          the customer's name to itself. Android's hardware button walks the same `back()`
          graph in the effect above, so the two never disagree. */}
      {step !== "search" && (
        <StepBack
          onPress={() => {
            if (back()) clearErrors();
          }}
        />
      )}

      {/* The scroll belongs to each step (`StepScroll`), not to the container: a step's
          commitment is pinned in the thumb's reach below it, and the footer needs that
          step's own state to label itself. */}
      {body}

      <OutboxSheet
        visible={outboxOpen}
        items={outbox}
        pointsName={pointsName}
        online={online}
        onClose={() => setOutboxOpen(false)}
        onRetry={(item: OutboxItem) => {
          void releaseQueued(item.id).then(() => drainOutbox());
        }}
        onDiscard={(item: OutboxItem) => void discardQueued(item.id)}
        onSendNow={() => void drainOutbox()}
      />
    </View>
  );
}

function headerTitle(step: string, customer: CustomerRewardsResponse | undefined): string {
  if (step === "receipt") return "Done";
  if (step === "search") return "Cashier";
  if (step === "scan") return "Scan card";
  return customer?.customer.name ?? "Cashier";
}

/**
 * The message from a failed request.
 *
 * Errors from axios are `unknown` here — reading `error.response.data.message` off them
 * throws when the rejection is not an axios error, which is how a failure at the counter
 * turns into a blank screen. The web has `utils/apiError.ts`; this app has nothing, so the
 * narrowing is local until it does.
 */
function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) return fallback;

  // A plan refusal mid-shift, most often a subscription that lapsed while the tab was
  // open. The server's own wording here is "No active subscription" / "Subscription
  // missing features", which tells a cashier nothing about what to do next.
  const denial = accessDenialReason(error);
  if (denial === "subscription_expired") {
    return "This subscription has ended.";
  }
  if (denial === "subscription") {
    return "No subscription for Loyalty.";
  }

  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data === "object" && data !== null) {
    for (const key of ["error", "message"] as const) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
