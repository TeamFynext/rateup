import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMultipleWaContacts,
  getAllWaContacts,
  getWaContactByWaContactId,
} from "./wacontact.api";
import {
  showErrorToast,
  showSuccessToast,
} from "../../../../utils/notifications";

export const useAddMultipleWaContacts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactIds }: { contactIds: string[] }) =>
      addMultipleWaContacts(contactIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["contactsNotInWaContact"],
      });
      queryClient.invalidateQueries({ queryKey: ["wa-contacts"] });
      showSuccessToast(data.data);
    },
    onError: (error) => {
      showErrorToast(error.message);
    },
  });
};

export const useGetAllWaContacts = () => {
  return useQuery({
    queryKey: ["wa-contacts"],
    queryFn: getAllWaContacts,
  });
};

export const useGetWaContactByWaContactId = (waContactId: string) => {
  return useQuery({
    queryKey: ["wa-contact", waContactId],
    queryFn: () => getWaContactByWaContactId(waContactId),
    enabled: !!waContactId,
  });
};
