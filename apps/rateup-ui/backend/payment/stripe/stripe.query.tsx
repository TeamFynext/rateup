import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { createStripeCheckoutSession } from "./stripe.api";

export function useCreateStripeCheckoutSession(setIsLoading) {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: any) => createStripeCheckoutSession(values),
    onSuccess: (data) => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Processing Started",
        message: "Please wait get ready for payment",
        icon: <IconCheck size="1rem" />,
        loading: true,
        autoClose: 3000,
      });
      setIsLoading(false);
      //setOrder(data.data.data);
    },
    onError: (error: any) => {
      console.error("Error creating order:" + error.message);
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });

      setIsLoading(false);
    },
  });
}
