"use client";

import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useAutomationSubscription,
  useUpdateAutomationTriggerSubscription,
  useUpdateAutomationUsageStats,
  useUpdateFreePlanSubscriptionExpiry,
  useUpdateLifecycle,
  useUpdateSubscriptionNewFeat,
  useUpdateUsageStats,
} from "@/backend/updations/update.query";
import { isProduction } from "@/utils/constants";

function UpdateAllThemes() {
  const updateStats = useUpdateUsageStats();
  const { mutate } = useAutomationSubscription();
  const updateAutomTr = useUpdateAutomationTriggerSubscription();
  const updateAutStat = useUpdateAutomationUsageStats();
  const updateFeat = useUpdateSubscriptionNewFeat();
  const updateFreePlan = useUpdateFreePlanSubscriptionExpiry();
  const updateLife = useUpdateLifecycle();

  return (
    <Stack>
      <Stack mt="xl">
        <Title order={2}>Update template message count in usage stats</Title>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateStats.mutate();
          }}
          loading={updateStats.isPending}
        >
          update
        </Button>
      </Stack>
      {!isProduction && (
        <>
          <Stack mt="xl">
            <Title order={2}>Update Automation Subscription</Title>
            <Text>
              This will add the automation to subscription for all users
            </Text>
            <Button
              ml="md"
              style={{ alignSelf: "flex-start" }}
              onClick={() => {
                mutate();
              }}
              loading={updateStats.isPending}
            >
              Update Subscription
            </Button>
          </Stack>

          <Stack mt="xl">
            <Title order={2}>Update Automation Trigger Subscription</Title>
            <Text>
              This will add the automation Trigger to subscription & rateupplans{" "}
            </Text>
            <Button
              ml="md"
              style={{ alignSelf: "flex-start" }}
              onClick={() => {
                updateAutomTr.mutate();
              }}
              loading={updateAutomTr.isPending}
            >
              Update
            </Button>
          </Stack>

          <Stack mt="xl">
            <Title order={2}>Update Automation Usage stats</Title>
            <Text>This will update automation count in usage stats</Text>
            <Button
              ml="md"
              style={{ alignSelf: "flex-start" }}
              onClick={() => {
                updateAutStat.mutate();
              }}
              loading={updateAutStat.isPending}
            >
              Update
            </Button>
          </Stack>
          <Stack mt="xl">
            <Title order={2}>Update Subscription new features</Title>
            <Text>
              This will add webhooks, leadad automation, carousel template in
              subscription feature
            </Text>
            <Button
              ml="md"
              style={{ alignSelf: "flex-start" }}
              onClick={() => {
                updateFeat.mutate();
              }}
              loading={updateFeat.isPending}
            >
              Update
            </Button>
          </Stack>
        </>
      )}
      <Stack mt="xl">
        <Title order={2}>Update Free plan subscription expiry</Title>
        <Text>
          This will update all free plan subscription expiry date to 100 years
          ahead
        </Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateFreePlan.mutate();
          }}
          loading={updateFreePlan.isPending}
        >
          Update
        </Button>
      </Stack>
      <Stack mt="xl">
        <Title order={2}>Update lifecycle</Title>
        <Text>This will add default lifecycle</Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateLife.mutate();
          }}
          loading={updateLife.isPending}
        >
          Update
        </Button>
      </Stack>
    </Stack>
  );
}

export default UpdateAllThemes;
