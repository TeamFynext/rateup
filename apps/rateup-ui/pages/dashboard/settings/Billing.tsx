import {
  Badge,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import React from "react";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { checkExpiry } from "../../../components/Premium/ExpiryComponent";
import { formatIsoDateString } from "../../../utils/dateTime";

const Billing = ({ subscription, toggle, processingPayment }) => {
  return (
    <Stack style={{ maxWidth: "1000px" }}>
      <Title order={2}>Billing</Title>
      <Divider mb="md" />

      {processingPayment ? (
        <Loader color="blue" type="bars" />
      ) : (
        <Stack>
          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Current Plan :
            </Title>
            <Text> {subscription?.basePlan?.name} </Text>
            {checkExpiry(subscription?.expiresAt) ||
            subscription?.basePlan?.name === "RATEUP TRIAL" ||
            subscription?.basePlan?.name === "FREE PLAN" ? (
              <RateupButtonPrimary title="Upgrade plan" onClick={toggle} />
            ) : (
              <RateupButtonPrimary title="Buy Addons" />
            )}
          </Group>

          <Group mt="xl" ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Validity :
            </Title>
            {checkExpiry(subscription?.expiresAt) ? (
              <>
                <Text> {formatIsoDateString(subscription?.expiresAt)} </Text>
                <Badge color="red">Expired</Badge>
              </>
            ) : (
              <>
                <Text> {formatIsoDateString(subscription?.expiresAt)} </Text>
                <Badge color="green">Active</Badge>
              </>
            )}
          </Group>
          <Group mt="xl" ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Addons :
            </Title>
            Nil
          </Group>
        </Stack>
      )}
    </Stack>
  );
};

export default Billing;
