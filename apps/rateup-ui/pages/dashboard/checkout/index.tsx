import React, { useEffect, useState } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

import { loadStripe } from "@stripe/stripe-js";

//stripe checkout

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY, {});

const Checkout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadStripe, setLoadStripe] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  return (
    <div>
      {loadStripe && clientSecret && (
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
