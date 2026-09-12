import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import {
  applyRedemption,
  assignRewardToCustomer,
  awardPoints,
  createApprovalRequest,
  createLoyaltyCustomer,
  getCustomerRewardsByPhone,
  getEventTriggers,
  getLoyaltyEarningRules,
  getLoyaltyProgram,
  getLoyaltyRewards,
  getLoyaltyTiers,
  lookupContactByPhone,
  redeemReward,
  redeemRewardByShortCode,
  searchContactsForEnrolment,
  searchCustomers,
  verifyRedemption,
} from "./loyalty.api";
import { cashierInvalidations, loyaltyKeys } from "./loyalty.keys";
import type { AssignRewardRequest } from "./loyalty.type";

/**
 * The loyalty hooks.
 *
 * Two rules the cashier depends on:
 *
 * **Every write sweeps `cashierInvalidations(phone)`.** The previous versions invalidated
 * keys no query registered under, so the balance on screen did not move after an award.
 * Nothing here writes its own key literal.
 *
 * **No mutation raises a toast.** A notice shown while a native `Modal` is open renders
 * *behind* it (see `components/common/Notice.tsx`), so a toast from a counter action is the
 * one place it is guaranteed not to be read. Every outcome — success and failure — is
 * reported inline by the screen that asked for it, on a receipt or on the form itself.
 */

function sweepCashier(client: QueryClient, phone: string | null | undefined): void {
  for (const queryKey of cashierInvalidations(phone)) {
    client.invalidateQueries({ queryKey });
  }
}

/* ── reads ──────────────────────────────────────────────────────────────────── */

/**
 * The open customer. Gated on ten digits because the phone is typed a digit at a time and
 * a partial number is a guaranteed 404 — the same gate the recents dedup relies on.
 */
export const useCustomerRewardsByPhone = (phone: string) =>
  useQuery({
    queryKey: loyaltyKeys.cashierCustomer(phone),
    queryFn: () => getCustomerRewardsByPhone(phone),
    enabled: phone.length >= 10,
    retry: false,
  });

export const useSearchCustomers = (search: string) =>
  useQuery({
    queryKey: loyaltyKeys.cashierSearch(search),
    queryFn: () => searchCustomers(search),
    enabled: search.length >= 2,
    staleTime: 15_000,
  });

export const useContactLookupByPhone = (phone: string, enabled: boolean) =>
  useQuery({
    queryKey: loyaltyKeys.contactLookup(phone),
    queryFn: () => lookupContactByPhone(phone),
    enabled: enabled && phone.length > 0,
    // A contact's name does not change between keystrokes; don't refetch on every focus.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

/**
 * The org's contacts for the "from contacts" picker. An empty search lists the most
 * recently active, so the list is useful before anything is typed.
 */
export const useEnrolmentContacts = (search: string) =>
  useQuery({
    queryKey: loyaltyKeys.enrolmentContacts(search),
    queryFn: () => searchContactsForEnrolment(search),
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });

export const useLoyaltyProgram = () =>
  useQuery({
    queryKey: loyaltyKeys.program(),
    queryFn: getLoyaltyProgram,
    staleTime: 5 * 60 * 1000,
  });

export const useLoyaltyTiers = () =>
  useQuery({
    queryKey: loyaltyKeys.tiers(),
    queryFn: getLoyaltyTiers,
    staleTime: 5 * 60 * 1000,
  });

export const useLoyaltyRewards = () =>
  useQuery({
    queryKey: loyaltyKeys.rewards(),
    queryFn: getLoyaltyRewards,
    staleTime: 60 * 1000,
  });

/** The rules the on-screen estimate is computed from, so staff read the number before pressing. */
export const useLoyaltyEarningRules = () =>
  useQuery({
    queryKey: loyaltyKeys.earningRules(),
    queryFn: getLoyaltyEarningRules,
    staleTime: 5 * 60 * 1000,
  });

/** Which loyalty messages are switched on — what the receipt's WhatsApp block reads. */
export const useEventTriggers = (programId: string | undefined) =>
  useQuery({
    queryKey: loyaltyKeys.eventTriggers(programId),
    queryFn: () => getEventTriggers(programId as string),
    enabled: Boolean(programId),
    staleTime: 5 * 60 * 1000,
  });

/* ── writes ─────────────────────────────────────────────────────────────────── */

export const useAwardPointsMutation = (phone?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: awardPoints,
    onSuccess: () => sweepCashier(client, phone),
  });
};

/** Spends points on a reward. Now on `/redemptions/redeem` — see the api note. */
export const useRedeemReward = (phone?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: redeemReward,
    onSuccess: () => sweepCashier(client, phone),
  });
};

/** Reads a code without spending anything, so the counter can see whose it is first. */
export const useVerifyRedemption = () => useMutation({ mutationFn: verifyRedemption });

export const useApplyRedemption = (phone?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: applyRedemption,
    onSuccess: () => sweepCashier(client, phone),
  });
};

export const useAssignRewardMutation = (phone?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignRewardRequest) => assignRewardToCustomer(payload),
    onSuccess: () => sweepCashier(client, phone),
  });
};

/**
 * Marks an issued gift used.
 *
 * It sweeps the open customer, which the web version does not: without it the gift stays
 * listed as pending on the screen staff are looking at.
 */
export const useRedeemRewardByShortCode = (phone?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: redeemRewardByShortCode,
    onSuccess: () => sweepCashier(client, phone),
  });
};

export const useCreateLoyaltyCustomer = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyCustomer,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: loyaltyKeys.cashierCustomer() });
      client.invalidateQueries({ queryKey: loyaltyKeys.enrolmentContacts() });
    },
  });
};

/** Files a points adjustment for approval — how the counter undoes a purchase. */
export const useCreateApprovalRequest = (phone?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createApprovalRequest,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: loyaltyKeys.approvals() });
      sweepCashier(client, phone);
    },
  });
};
