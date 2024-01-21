import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWaFlow, getWaFlows, getWaSingleFlow } from "./waFlows.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

const useGetWaFlows = () => {
  return useQuery({
    queryKey: ["waFlowsList"],
    queryFn: async () => await getWaFlows(),
  });
};

const useGetSingleFlow = (flowId) => {
  return useQuery({
    queryKey: ["waSingleFlow", flowId],
    queryFn: async () => await getWaSingleFlow(flowId),
  });
};

const useCreateFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWaFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["waFlowsList"],
      });
      showSuccessToast(
        "Settigs Updated Successfully",
        "create-wa-flow",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Something went wrong, Please try again later`,
        "create-wa-flow",
        <IconX />,
      );
    },
  });
};

export { useGetWaFlows, useGetSingleFlow, useCreateFlowMutation };
