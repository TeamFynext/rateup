import { useQuery } from "@tanstack/react-query";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import { getCustomerRewardsByPhone, searchCustomers } from "./cashier.api";

/**
 * Hook to get customer rewards by phone number
 */
export const useCustomerRewardsByPhone = (phone: string) => {
  return useQuery({
    queryKey: loyaltyKeys.cashierCustomer(phone),
    queryFn: () => getCustomerRewardsByPhone(phone),
    enabled: phone.length >= 10,
    retry: false,
  });
};

/**
 * Hook to search customers by partial name or phone
 */
export const useSearchCustomers = (search: string) => {
  return useQuery({
    queryKey: loyaltyKeys.cashierSearch(search),
    queryFn: () => searchCustomers({ search }),
    enabled: search.length >= 2,
    staleTime: 15_000,
  });
};
