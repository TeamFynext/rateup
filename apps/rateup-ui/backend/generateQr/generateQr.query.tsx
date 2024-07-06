import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQr, getAllGeneratedQrs } from "./generateQr.api";
import { showErrorToast, showSuccessToast } from "utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

function useGetAllGeneratedQrsQuery() {
  return useQuery({
    queryKey: ["generatedQrs"],
    queryFn: getAllGeneratedQrs,
  });
}

function useCreateQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQr,
    onSuccess: () => {
      showSuccessToast("Created QR successfully.", "CreateQr", <IconCheck />);
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: () => {
      showErrorToast(
        "Unable to create QR, please try again later",
        "CreateQr",
        <IconX />,
      );
    },
  });
}

export { useGetAllGeneratedQrsQuery, useCreateQrMutation };
