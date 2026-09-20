import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import type { ColumnFilterState, PaginationState, SortState } from "@/types/api.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { CONTACT_SORT } from "@/utils/constants.ts";

import type { AssignRewardRequest } from "./assignReward.api";
import { assignRewardToCustomer } from "./assignReward.api";
import {
  awardPoints,
  createLCAction,
  createLoyaltyCustomer,
  deleteLoyaltyCustomer,
  exportCustomers,
  getAllCustomers,
  getLoyaltyCustomerByContactId,
  getLoyaltyCustomerById,
  lookupContactByPhone,
  searchContactsForEnrolment,
  importCustomers,
  updateLoyaltyCustomer,
  type UpdateLoyaltyCustomerInput,
} from "./customer.api";

export const useCreateLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      // The new member's row in the cashier's "from contacts" list now needs its badge.
      qc.invalidateQueries({ queryKey: loyaltyKeys.enrolmentContacts() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating customer");
    },
  });
};

/**
 * Looks a phone number up against the org's contacts so the add-customer form can fill
 * in a name it already has.
 *
 * `enabled` is the security boundary as much as an optimisation: the endpoint is
 * authenticated, so the public registration page must pass `enabled: false` rather than
 * relying on the request simply failing.
 */
export const useContactLookupByPhone = (phone: string, enabled: boolean) => {
  return useQuery({
    queryKey: loyaltyKeys.contactLookup(phone),
    queryFn: () => lookupContactByPhone(phone),
    enabled: enabled && phone.length > 0,
    // A contact's name does not change between keystrokes; don't refetch on every focus.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

/**
 * The org's contacts for the cashier's "from contacts" picker. An empty search lists the
 * most recently active ones, so the list is useful before anything is typed.
 */
export const useEnrolmentContacts = (search: string) => {
  return useQuery({
    queryKey: loyaltyKeys.enrolmentContacts(search),
    queryFn: () => searchContactsForEnrolment(search),
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });
};

export const useGetLoyaltyCustomerById = (customerId: string) => {
  return useQuery({
    queryFn: () => getLoyaltyCustomerById(customerId),
    queryKey: loyaltyKeys.customer(customerId),
    enabled: !!customerId,
  });
};

export const useGetLoyaltyCustomerByContactId = (contactId: string) => {
  return useQuery({
    queryFn: () => getLoyaltyCustomerByContactId(contactId),
    queryKey: loyaltyKeys.customerByContact(contactId),
    enabled: !!contactId,
  });
};

export const useLoyaltyCustomers = (
  pagination: PaginationState,
  searchData?: string,
  sorting?: SortState,
  columnFilters?: ColumnFilterState[],
) => {
  const sort = sorting ?? CONTACT_SORT;
  const filters = columnFilters ?? [];
  const search = searchData ?? "";
  return useQuery({
    queryFn: () => getAllCustomers(pagination, search, sort, filters),
    queryKey: loyaltyKeys.customerList(pagination, search, sort, filters),
  });
};

export const useDeleteLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      toast.success("Success");
    },
    onError: (error) => {
      toast.error(error?.message || "Error");
    },
  });
};

export const useLCAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLCAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      toast.success("Action recorded");
    },
    onError: (error) => {
      toast.error(error?.message || `Failed`);
    },
  });
};

export const useImportCSVCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importCustomers,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      toast.success("Contacts imported successfully", {
        // <IconCheck />,
        id: "Customer-create",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating the Customer`, {
        // <IconX />,
        id: "contact-create",
      });
    },
  });
};

export const useExportCustomersMutation = () => {
  return useMutation({
    mutationFn: (format: "csv" | "excel" = "excel") => exportCustomers(format),
    onSuccess: (data, variables = "excel") => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      const extension = variables === "csv" ? "csv" : "xlsx";
      link.setAttribute("download", `customers-${new Date().toISOString()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Exported successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error exporting");
    },
  });
};

export const useUpdateLoyaltyCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: UpdateLoyaltyCustomerInput }) =>
      updateLoyaltyCustomer(customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      queryClient.invalidateQueries({
        queryKey: loyaltyKeys.customer(variables.customerId),
      });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      // The panel on the Customers page reads the customer through the cashier's
      // by-phone lookup, not the list — an edited name would otherwise stay stale there
      // until the query went cold.
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cashierCustomer() });
      toast.success("Customer updated successfully");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not save the customer"));
    },
  });
};

export const useAwardPointsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      contactId: string;
      purchaseAmount: number;
      locationId?: string;
      productCategories?: string[];
      productSkus?: string[];
      paymentMethod?: string;
      channel?: string;
      orderId?: string;
      notes?: string;
    }) => awardPoints(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      queryClient.invalidateQueries({
        queryKey: loyaltyKeys.customerByContact(variables.contactId),
      });
      // The award only carries a contactId, so sweep every customer detail rather than the
      // one row. Without this the detail view keeps the balance it was opened with.
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.customer() });
      // Awarding writes an `earn` row, and may move the customer up a tier.
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cashierCustomer() });
      // No success toast: the cashier shows a receipt, which says more and stays put.
    },
    onError: (error) => {
      toast.error(error?.message || `Error awarding points`);
    },
  });
};

export const useAssignRewardMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignRewardRequest) => assignRewardToCustomer(payload),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({
        queryKey: loyaltyKeys.customer(payload?.data?.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: loyaltyKeys.customers(),
      });
      // Drives the panel's available/issuable/redeemed reward lists — the assigned reward
      // does not appear there until this refetches.
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cashierCustomer() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      onSuccess?.();
      toast.success("Reward assigned successfully!");
    },
    onError: (error) => {
      console.error("Error assigning reward:", error);
      toast.error(error?.message || "Failed to assign reward");
    },
  });
};
