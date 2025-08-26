import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useAutomationSubscription,
  useUpdateUsageStats,
} from "@/backend/updations/update.query";

function UpdateAllThemes() {
  const updateStats = useUpdateUsageStats();
  const { mutate } = useAutomationSubscription();

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
      <Stack mt="xl">
        <Title order={2}>Update Automation Subscription</Title>
        <Text>This will add the automation to subscription for all users</Text>
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
    </Stack>
  );
}

export default UpdateAllThemes;
