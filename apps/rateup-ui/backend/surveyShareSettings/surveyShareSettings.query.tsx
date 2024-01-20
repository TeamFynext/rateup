import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getShareSettings,
  upadateShareSettings,
} from "./surveyShareSettings.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

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
        showSuccessToast(
          "Settigs Updated Successfully",
          "survey-share-settings",
          <IconCheck />,
        );
      }
    },
    onError: (error: any) => {
      showErrorToast(
        `Something went wrong, Please try again later`,
        "campaign-create",
        <IconX />,
      );
    },
  });
};

export { useGetShareSettings, useUpdateShareSettingsMutation };
