import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CONTACT_SORT } from "@/components/Contacts/utils/utils.tsx";

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
  importCustomers,
  updateLoyaltyCustomer,
} from "./customer.api";

export const useCreateLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating customer");
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

const useGetLoyaltyCustomerByContactId = (contactId: string) => {
  return useQuery({
    queryFn: () => getLoyaltyCustomerByContactId(contactId),
    queryKey: ["loyaltyCustomerByContact", contactId],
    enabled: !!contactId,
  });
};

export const useLoyaltyCustomers = (
  pagination,
  searchData?,
  sorting?,
  columnFilters?,
) => {
  const sort = sorting ?? CONTACT_SORT;
  const filters = columnFilters ?? [];
  const search = searchData ?? "";
  return useQuery({
    queryFn: () => getAllCustomers(pagination, search, sort, filters),
    queryKey: ["loyaltyCustomers", pagination, search, sort, filters],
  });
};

const useDeleteLoyaltyCustomerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLoyaltyCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Success");
    },
    onError: (error) => {
      toast.error(error?.message || "Error");
    },
  });
};

const useLCAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLCAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.success("success action");
    },
    onError: (error) => {
      toast.error(error?.message || `Failed`);
    },
  });
};

const useImportCSVCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importCustomers,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
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
      link.setAttribute(
        "download",
        `customers-${new Date().toISOString()}.${extension}`,
      );
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

const useUpdateLoyaltyCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: string;
      data: { status?: "active" | "suspended" | "closed" };
    }) => updateLoyaltyCustomer(customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({
        queryKey: ["loyaltyCustomer", variables.customerId],
      });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating customer`);
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
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({
        queryKey: ["loyaltyCustomerByContact", variables.contactId],
      });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-cashier-customer"] });
      toast.success("Points awarded successfully");
    },
    onError: (error) => {
      toast.error(error?.message || `Error awarding points`);
    },
  });
};

export const useAssignRewardMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignRewardRequest) =>
      assignRewardToCustomer(payload),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["loyalty-customer", payload?.data?.customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-customers"],
      });
      onSuccess?.();
      toast.success("Reward assigned successfully!");
    },
    onError: (error) => {
      console.error("Error assigning reward:", error);
      toast.error(
        error?.message || error?.message || "Failed to assign reward",
      );
    },
  });
};
