import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLoyaltyCustomer,
  deleteLoyaltyCustomer,
  getAllCustomers,
} from "./customer.api";

export const useCreateLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
    },
  });
};

export const useLoyaltyCustomers = () =>
  useQuery({
    queryFn: getAllCustomers,
    queryKey: ["loyaltyCustomers"],
  });

export const useDeleteLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showSuccessToast("Success");
    },
    onError: () => {
      showErrorToast("Error");
    },
  });
};
