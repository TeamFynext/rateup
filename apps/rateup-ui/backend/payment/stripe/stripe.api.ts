import { axiosClient } from "../../apiClient";

export async function createStripeCheckoutSession(data: any) {
  return await axiosClient.post(
    `/payment/stripe/create-checkout-session`,
    data,
  );
}
