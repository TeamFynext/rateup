import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useGetStripeCheckoutSession } from "../../../../backend/payment/stripe/stripe.query";

const CheckoutReturn = () => {
  const router = useRouter();
  const { session_id } = router.query;

  const { data: sessionData, refetch } =
    useGetStripeCheckoutSession(session_id);

  useEffect(() => {
    refetch();
    console.log(session_id);
  }, [session_id]);

  useEffect(() => {
    console.log(sessionData);
  }, [sessionData]);

  return <div>CheckoutReturn</div>;
};

export default CheckoutReturn;
