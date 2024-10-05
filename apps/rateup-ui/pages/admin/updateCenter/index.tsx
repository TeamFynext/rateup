import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useUpdateFreePlanSubscription,
  useUpdateGoogleReviewQuestions,
} from "@/backend/updations/update.query";

function UpdateAllThemes() {
  const updateGoogleReviewQuestionsMutation = useUpdateGoogleReviewQuestions();
  const updateFreePlanSubscription = useUpdateFreePlanSubscription();

  const isDev =
    process.env.NEXT_PUBLIC_FRONTEND_URL === "https://dev.rateup.app";

  return (
    <Stack>
      <Stack mt="xl">
        <Title order={2}>Update Google Review Questions</Title>
        <Text>
          Update Google Review Questions of all surveys with new property
          reviewPageOptions, reviewPagePlatform
        </Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateGoogleReviewQuestionsMutation.mutate();
          }}
          loading={updateGoogleReviewQuestionsMutation.isPending}
        >
          Update
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
