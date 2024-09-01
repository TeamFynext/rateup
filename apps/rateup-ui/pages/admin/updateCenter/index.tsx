import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useCreateHubSpotContacts,
  useUpdateWebSurveyPagesTheme,
} from "@/backend/updations/update.query";

function UpdateAllThemes() {
  const exportUserToHubSpot = useCreateHubSpotContacts();
  const updatePageTypeQuestionsMutations = useUpdateWebSurveyPagesTheme();

  return (
    <Stack>
      <Stack mt="xl">
        <Title order={2}>Update WebSurveyPagesTheme</Title>
        <Text>
          Updates webSurveyPagesTheme column of survey table, which is used in
          survey editor page.
        </Text>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updatePageTypeQuestionsMutations.mutate();
          }}
        >
          Update WebSurveyPagesTheme
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
