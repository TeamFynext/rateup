import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CONTACT_SORT } from "@/components/Contacts/utils/utils";

import {
  addNewCustomersFromCSV,
  getCustomerGroupById,
} from "./customerGroup.api";

export const useAddNewCustomersFromCSVMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addNewCustomersFromCSV,
    onSettled: () => {
      (queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      }),
        queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] }),
        toast.success("Added new member successfully.", {
          // <IconCheck />,
          id: "customer-group-add-member",
        }));
    },
    onError: (error) => {
      toast.error(error?.message || `Error adding member`, {
        // <IconX />,
        id: "customer-group-add-member",
      });
    },
  });
};

export const useCustomerGroupById = (
  groupId: string,
  enabled = false,
  pagination,
  searchData?,
  sorting?,
  columnFilters?,
) => {
  let sort = sorting ?? CONTACT_SORT;
  let filters = columnFilters ?? [];
  let search = searchData ?? "";
  return useQuery({
    queryKey: ["customerGroupById", groupId, pagination, search, sort, filters],
    queryFn: () =>
      getCustomerGroupById(groupId, pagination, search, sort, filters),
    enabled: !!groupId && enabled,
  });
};
