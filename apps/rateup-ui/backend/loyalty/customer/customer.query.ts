import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLoyaltyCustomer, getAllCustomers } from "./customer.api";
import { showErrorToast } from "../../../utils/notifications";

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
    queryKey: ["loyaltyCustomer"],
  });
