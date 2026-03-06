import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getShareSettings,
  upadateShareSettings,
} from "./surveyShareSettings.api";

const useGetShareSettings = (queryKey, resourceName, id) => {
  return useQuery({
    queryKey: [queryKey, { resourceName, id }],
    queryFn: getShareSettings,
  });
};

const useUpdateShareSettingsMutation = (queryKey, resourceName, id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upadateShareSettings,
    onSuccess: () => {
      if (queryKey && resourceName && id) {
        queryClient.invalidateQueries({
          queryKey: [queryKey, { resourceName, id }],
        });
        toast.success("Settings Updated Successfully", {
          id: "survey-share-settings",
        });
      }
    },
    onError: (error) => {
      toast.error(
        error?.message || `Something went wrong, Please try again later`,
        {
          id: "campaign-create",
        },
      );
    },
  });
};

export { useGetShareSettings, useUpdateShareSettingsMutation };
