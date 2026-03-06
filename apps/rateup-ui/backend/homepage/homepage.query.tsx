import { IconCheck } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { IContactForm, sendContactMessage } from "./homepage.api";

export function useSendContactFormMutation(setIsLoading) {
  return useMutation({
    mutationFn: (values: IContactForm) => sendContactMessage(values),
    onSuccess: () => {
      toast.loading("Message sent Successfully!", {
        id: "load-data",
      });
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Error Sending msg:", error.message);
      toast.loading(error?.message, {
        id: "load-data",
      });

      setIsLoading(false);
    },
  });
}
