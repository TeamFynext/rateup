import { Badge, Group, Loader, Stack, Text, Title } from "@mantine/core";
import React from "react";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { checkExpiry } from "../../../components/Premium/ExpiryComponent";
import { formatIsoDateString } from "../../../utils/dateTime";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import Pricing from "../../../components/HomePage/pages/Pricing";
import { useDisclosure } from "@mantine/hooks";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";

const Billing = ({ subscription, processingPayment }) => {
  const [openedUpgradeModal, { toggle, close: closeUpgradeModal }] =
    useDisclosure(false);
  return (
    <>
      {processingPayment ? (
        <Loader type="bars" />
      ) : (
        <Stack>
          <Title order={4}>Current Plan</Title>
          <PaperLayout w={"60%"} p={"xl"}>
            <Stack gap={"xl"}>
              <Group justify="space-between">
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Plan Name
                  </Text>
                  <Group>
                    <Title order={5}>{subscription?.basePlan?.name}</Title>
                    {subscription?.basePlan?.name === "RATEUP TRIAL" ||
                    subscription?.basePlan?.name === "FREE PLAN" ? (
                      <RateupButtonPrimary
                        title="Upgrade plan"
                        onClick={toggle}
                      />
                    ) : null}
                  </Group>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Billing Cycle
                  </Text>
                  <Title order={5}>
                    {subscription?.basePlan?.paymentPlan?.period ?? "----"}
                  </Title>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Plan Cost
                  </Text>
                  <Title order={5}>
                    {subscription?.basePlan?.paymentPlan?.amount ?? "----"}
                  </Title>
                </Stack>
              </Group>
              <Stack gap={1}>
                <Text c={"GrayText"} fw={500} fz={15}>
                  Validity
                </Text>
                <Group>
                  <Text> {formatIsoDateString(subscription?.expiresAt)} </Text>
                  <Badge
                    color={
                      checkExpiry(subscription?.expiresAt) ? "red" : "green"
                    }
                  >
                    {checkExpiry(subscription?.expiresAt)
                      ? "Expired"
                      : "Active"}
                  </Badge>
                  {checkExpiry(subscription?.expiresAt) ? (
                    <RateupButtonPrimary
                      title="Upgrade plan"
                      onClick={toggle}
                    />
                  ) : null}
                </Group>
              </Stack>

              <Stack gap={1}>
                <Text c={"GrayText"} fw={500} fz={15}>
                  Addons
                </Text>
                <Group>
                  <Title order={5}>Nil</Title>
                  {!["FREE PLAN", "RATEUP TRIAL"].includes(
                    subscription?.basePlan?.name,
                  ) ? (
                    <RateupButtonPrimary title="Buy Addons" />
                  ) : null}
                </Group>
              </Stack>
            </Stack>
          </PaperLayout>
        </Stack>
      )}

      <FormModalLayout
        opened={openedUpgradeModal}
        onClose={closeUpgradeModal}
        centered
        title="Upgrade Your Plan"
        size="auto"
      >
        <Pricing isAccount={true} handleSelection={closeUpgradeModal} />
      </FormModalLayout>
    </>
  );
};

export default Billing;
