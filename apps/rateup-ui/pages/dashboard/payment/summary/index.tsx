import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useGetStripeCheckoutSession } from "../../../../backend/payment/stripe/stripe.query";
import { Flex, Paper, Stack, Text, Title } from "@mantine/core";
import { RateupButtonPrimary } from "../../../../components/Button/RateupButtons";
import { IconChevronLeft } from "@tabler/icons-react";

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
      <Paper p="md">
        <Flex
          gap="md"
          mih={"50vh"}
          justify="center"
          align="center"
          direction="column"
          wrap="wrap"
        >
          <Title order={1}>Thank You 🎉</Title>

          <Title order={2}>Your Order is getting Processed...</Title>
          <Text mb="xl">
            You will shortly receive an email confirmation, <br /> once your
            payment & order is processed successfully,
          </Text>
          <RateupButtonPrimary
            onClick={() =>
              router.push("/dashboard/settings?activeTab=account&view=myOrders")
            }
            title="Go to My Orders"
            leftIcon={<IconChevronLeft />}
          />
        </Flex>{" "}
      </Paper>
    </Stack>
  );
};

export default CheckoutReturn;
