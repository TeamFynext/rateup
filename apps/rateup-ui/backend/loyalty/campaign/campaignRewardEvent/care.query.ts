import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateRewardEventInput,
  createRewardEvent,
  getRewardEvents,
} from "./care.api";
import {
  showErrorToast,
  showSuccessToast,
} from "../../../../utils/notifications";

export function useRewardEvents(campaignId: string) {
  return useQuery({
    enabled: !!campaignId,
    queryFn: () => getRewardEvents(campaignId),
    queryKey: ["care", campaignId],
  });
}

export function useCreateRewardEventMutation(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRewardEventInput) =>
      createRewardEvent(campaignId, data),

    onSuccess: () => {
      showSuccessToast("Created Successfully");
    },
    onError: () => {
      showErrorToast("Could not create event");
    },
  });
}
