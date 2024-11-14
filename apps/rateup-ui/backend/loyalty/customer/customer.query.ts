import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { createLoyaltyCustomer, getAllCustomers } from "./customer.api";

export const useCreateLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyCustomer,
    onSuccess: () => {},
    onError: () => {
      showErrorToast("Something Went Wrong. Could not create customer");
    },
  });
};

export const useLoyaltyCustomers = () =>
  useQuery({
    queryFn: getAllCustomers,
    queryKey: ["loyaltyCustomers"],
  });
