import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useCreateHubSpotContacts,
  useUpdatePageTypeQuestions,
} from "@/backend/updations/update.query";

function UpdateAllThemes() {
  const updatePageTypeQuestionsMutations = useUpdatePageTypeQuestions();
  const exportUserToHubSpot = useCreateHubSpotContacts();

  return (
    <Stack>
      <Stack mt="xl">
        <Title order={2}>Update Page Type Questions</Title>
        <Text>
          Updates welcome, language, thankyou page type questions with title,
          subtitle, start button text values from active survey theme.
        </Text>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updatePageTypeQuestionsMutations.mutate();
          }}
        >
          Update Page type Questions.
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Export user data to hubspot</Title>
        <Text>Export user emails and org name to hubspot</Text>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            exportUserToHubSpot.mutate();
          }}
          loading={exportUserToHubSpot.isPending}
        >
          Export
        </Button>
      </Stack>
    </Stack>
  );
}

export default UpdateAllThemes;
