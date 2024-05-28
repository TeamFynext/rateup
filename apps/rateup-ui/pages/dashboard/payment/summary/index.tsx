import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useGetStripeCheckoutSession } from "../../../../backend/payment/stripe/stripe.query";
import { Stack, Text, Title } from "@mantine/core";
import { RateupButtonPrimary } from "../../../../components/Button/RateupButtons";

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

  return (
    <Stack>
      <Title order={2}> Your checkout process is complete.</Title>
      <Text>
        {" "}
        Once your payment & order is processed successfully, You will receive an
        email confirmation.{" "}
      </Text>
      <RateupButtonPrimary
        onClick={() => router.push("/dashboard/settings?activeTab=account")}
        title="Back to My Order"
      />
    </Stack>
  );
};

export default CheckoutReturn;
