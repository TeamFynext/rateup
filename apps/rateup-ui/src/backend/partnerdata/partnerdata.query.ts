import { useMutation } from "@tanstack/react-query";

import { submitPartnerApplication } from "./partnerdata.api";

export function usePartnerApplicationMutation() {
  return useMutation({
    mutationFn: submitPartnerApplication,
  });
}
