import React, { useEffect } from "react";
import { useRouter } from "next/router";

import { Flex, Paper, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useGetStripeCheckoutSession } from "../../../../backend/payment/stripe/stripe.query";
import { RateupButtonPrimary } from "../../../../components/Button/RateupButtons";

const CheckoutReturn = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const translations = useTranslations();
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
          <Title order={2}>{translations("Thank You 🎉")}</Title>

          <Title order={2}>
            {translations("Your Order is getting Processed...")}
          </Title>
          <Text mb="xl">
            {translations("You will shortly receive an email confirmation,")}{" "}
            <br />{" "}
            {translations(
              "once your payment & order is processed successfully,",
            )}
          </Text>
          <RateupButtonPrimary
            onClick={() =>
              router.push("/dashboard/settings?tab=account&view=myOrders")
            }
            title={translations("Go to My Orders")}
            leftIcon={<IconChevronLeft />}
          />
        </Flex>{" "}
      </Paper>
    </Stack>
  );
};

export default CheckoutReturn;
