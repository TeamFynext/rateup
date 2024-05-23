import React, { useEffect, useState } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/router";
import { useCreateStripeCheckoutSession } from "../../../../backend/payment/stripe/stripe.query";
import { useRouteAndCartStore } from "../../../../components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { useUser } from "../../../../context/UserContext";

//stripe checkout

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY, {});

const Checkout = () => {
  const router = useRouter();
  const { cart, reset } = useRouteAndCartStore();
  const { user } = useUser();
  const { pid } = router.query;

  const [isLoading, setIsLoading] = useState(false);
  const [loadStripe, setLoadStripe] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  const createCheckout = useCreateStripeCheckoutSession(setIsLoading);

  useEffect(() => {
    pid && handleStripe();
  }, [pid]);

  useEffect(() => {
    reset();
  }, []);

  function handleStripe() {
    let data = {
      priceId: pid,
      planName: cart.name,
      rateupPlanId: cart.id,
      orgId: user?.orgId,
    };
    createCheckout.mutate(data, {
      onSuccess: (data) => {
        console.log("data", data?.data);
        setClientSecret(data?.data?.clientSecret);
        setLoadStripe(true);
      },
      onError: () => {},
    });
  }

  return (
    <div>
      {pid && clientSecret && (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
    </div>
  );
};

export default Checkout;
