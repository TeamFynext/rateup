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
import { Flex, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { RateupButtonPrimary } from "../../../../components/Button/RateupButtons";
import { IconChevronLeft, IconReload } from "@tabler/icons-react";
import Loading from "../../../../components/Page/Loading";

//stripe checkout

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY, {});

const Checkout = () => {
  const router = useRouter();
  const { cart, reset } = useRouteAndCartStore();
  const { user } = useUser();
  const { pid } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [loadStripe, setLoadStripe] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  const createCheckout = useCreateStripeCheckoutSession(setIsLoading);

  useEffect(() => {
    pid && handleStripe();
  }, [pid]);

  useEffect(() => {
    console.log("cart", cart);
  }, [pid, cart]);

  function handleStripe() {
    if (cart?.id?.length > 0) {
      let data = {
        priceId: pid,
        planName: cart?.name,
        rateupPlanId: cart?.id,
        orgId: user?.orgId,
        email: user?.email,
      };
      createCheckout.mutate(data, {
        onSuccess: (data) => {
          console.log("data", data?.data);
          setClientSecret(data?.data?.clientSecret);
          setLoadStripe(true);
          reset();
        },
        onError: () => {
          reset();
        },
      });
    }
  }

  return (
    <div>
      {isLoading && cart?.id?.length > 0 && <Loading />}

      {cart?.id?.length < 1 && !loadStripe && !isLoading && (
        <Stack>
          <Paper p="md">
            <Flex
              gap="md"
              mih={"50vh"}
              justify="center"
              align="center"
              direction="column"
              wrap="wrap"
            >
              <Title order={3} mb="xl">
                Session Expired..!
              </Title>

              <Group style={{ maxWidth: "300px" }}>
                <RateupButtonPrimary
                  onClick={() =>
                    router.push("/dashboard/settings?activeTab=account")
                  }
                  title="Go Back to Start Again"
                  fullWidth={false}
                  leftIcon={<IconChevronLeft />}
                />
              </Group>
            </Flex>{" "}
          </Paper>
        </Stack>
      )}
      {pid && clientSecret && loadStripe && (
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
