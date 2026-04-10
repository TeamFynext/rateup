"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimReward,
  ClaimRewardInput,
  CustomerSearchResult,
  getCustomerRewardsByPhone,
  searchCustomers,
  useRedemption,
  UseRedemptionInput,
} from "./cashier.api";

/**
 * Hook to get customer rewards by phone number
 */
export const useCustomerRewardsByPhone = (phone: string) => {
  return useQuery({
    queryKey: ["loyalty-cashier-customer", phone],
    queryFn: () => getCustomerRewardsByPhone(phone),
    enabled: phone.length >= 10,
    retry: false,
  });
};

/**
 * Hook to claim a reward for a customer
 */
export const useClaimReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClaimRewardInput) => claimReward(data),
    onSuccess: (_, variables) => {
      // Invalidate the customer rewards query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["loyalty-cashier-customer", variables.phone],
      });
    },
  });
};

/**
 * Hook to search customers by partial name or phone
 */
export const useSearchCustomers = (search: string) => {
  return useQuery({
    queryKey: ["loyalty-cashier-search", search],
    queryFn: () => searchCustomers({ search }),
    enabled: search.length >= 2,
    staleTime: 15_000,
  });
};

/**
 * Hook to mark a redemption as used
 */
export const useUseRedemption = (customerPhone: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UseRedemptionInput) => useRedemption(data),
    onSuccess: () => {
      // Invalidate the customer rewards query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["loyalty-cashier-customer", customerPhone],
      });
    },
  });
};
