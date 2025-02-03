import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CONTACT_SORT } from "@/components/Contacts/utils/utils";
import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  createLCAction,
  createLoyaltyCustomer,
  deleteLoyaltyCustomer,
  getAllCustomers,
  getLoyaltyCustomerById,
  importCustomers,
} from "./customer.api";

export const useCreateLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
    },
  });
};

export const useGetLoyaltyCustomerById = (customerId) => {
  return useQuery({
    queryFn: () => getLoyaltyCustomerById(customerId),
    queryKey: ["loyaltyCustomer", customerId],
    enabled: !!customerId,
  });
};

export const useLoyaltyCustomers = (
  pagination,
  searchData?,
  sorting?,
  columnFilters?,
) => {
  let sort = sorting ?? CONTACT_SORT;
  let filters = columnFilters ?? [];
  let search = searchData ?? "";
  return useQuery({
    queryFn: () => getAllCustomers(pagination, search, sort, filters),
    queryKey: ["loyaltyCustomers", pagination, search, sort, filters],
  });
};

export const useDeleteLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Success");
    },
    onError: () => {
      showErrorToast("Error");
    },
  });
};

export const useLCAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLCAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showSuccessToast("success action");
    },
    onError: (e: any) => {
      showErrorToast(`Failed:${e?.response?.data ?? ""}`);
    },
  });
};

export const useImportCSVCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importCustomers,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      showSuccessToast(
        "Contacts imported successfully",
        "Customer-create",
        // <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating the Customer: ${error?.response?.data?.error}`,
        "contact-create",
        // <IconX />,
      );
    },
  });
};
