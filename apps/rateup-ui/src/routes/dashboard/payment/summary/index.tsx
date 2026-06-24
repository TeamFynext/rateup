import { Flex, Paper, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useGetStripeCheckoutSession } from "@/backend/payment/stripe/stripe.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";

export const Route = createFileRoute("/dashboard/payment/summary/")({
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const session_id = searchParams.session_id;
  const { t: translations } = useTranslation();
  const { data: sessionData, refetch } = useGetStripeCheckoutSession(session_id);

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
        <Flex gap="md" mih={"50vh"} justify="center" align="center" direction="column" wrap="wrap">
          <Title order={2}>{translations("Thank You 🎉")}</Title>

          <Title order={2}>{translations("Your Order is getting Processed...")}</Title>
          <Text mb="xl">
            {translations("You will shortly receive an email confirmation,")} <br />{" "}
            {translations("once your payment & order is processed successfully,")}
          </Text>
          <RateupButtonPrimary
            onClick={() =>
              navigate({
                to: "/dashboard/settings/billing#order-history",
              })
            }
            title={translations("Go to My Orders")}
            leftIcon={<IconChevronLeft />}
          />
        </Flex>{" "}
      </Paper>
    </Stack>
  );
}
