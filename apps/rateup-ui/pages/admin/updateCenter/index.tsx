import { Button, Stack, Text, Title } from "@mantine/core";

import { useUpdateUsageStats } from "@/backend/updations/update.query";
import useTranslations from "@/dictionaries/useTranslation";

function UpdateAllThemes() {
  const updateStats = useUpdateUsageStats();
  const { translations } = useTranslations();

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
    </Stack>
  );
}

export default UpdateAllThemes;
