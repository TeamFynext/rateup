import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useUpdateFreePlanSubscription,
  useUpdateWebSurveyPagesTheme,
} from "@/backend/updations/update.query";

function UpdateAllThemes() {
  const updatePageTypeQuestionsMutations = useUpdateWebSurveyPagesTheme();
  const updateFreePlanSubscription = useUpdateFreePlanSubscription();

  const isDev =
    process.env.NEXT_PUBLIC_FRONTEND_URL === "https://dev.rateup.app";

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

      {isDev && (
        <Stack mt="xl">
          <Title order={2}>Update Free plan susbcription feature</Title>
          <Text>Update free plan features since it is missing</Text>

          <Button
            ml="md"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              updateFreePlanSubscription.mutate();
            }}
            loading={updateFreePlanSubscription.isPending}
          >
            Update
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

export default UpdateAllThemes;
