import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CONTACT_SORT } from "@/components/Contacts/utils/utils";
import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  addNewCustomersFromCSV,
  getCustomerGroupById,
} from "./customerGroup.api";

export const useAddNewCustomersFromCSVMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addNewCustomersFromCSV,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      }),
        queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] }),
        showSuccessToast(
          "Added new member successfully.",
          "customer-group-add-member",
          // <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding member: ${error?.response?.data?.error}`,
        "customer-group-add-member",
        // <IconX />,
      );
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
