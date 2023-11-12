import { Stack, Text } from "@mantine/core";
import { IconReload } from "@tabler/icons-react";
import { RateupButtonSecondary } from "../../Button/RateupButtons";

export function SurveysPageError({ refetch }) {
  return (
    <Stack>
      <Text>An error occured!</Text>
      <RateupButtonSecondary
        size="md"
        leftIcon={<IconReload />}
        title="Try again"
        onClick={refetch}
      />
    </Stack>
  );
}
