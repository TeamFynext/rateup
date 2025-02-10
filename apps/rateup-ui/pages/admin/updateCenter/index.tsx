import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useUpdateGoogleReviewQuestions,
  useUpdateSubscription,
  useUpdateThemeTitleSt,
  useUpdateUsageStatsResetDate,
} from "@/backend/updations/update.query";
import useTranslations from "@/dictionaries/useTranslation";

function UpdateAllThemes() {
  const updateGoogleReviewQuestionsMutation = useUpdateGoogleReviewQuestions();
  const updateThemest = useUpdateThemeTitleSt();

  const updateUsageStats = useUpdateUsageStatsResetDate();

  const updateSubscription = useUpdateSubscription();
  const { translations } = useTranslations();
  const isDev =
    process.env.NEXT_PUBLIC_FRONTEND_URL === "https://dev.rateup.app";

  return (
    <Stack>
      <Stack mt="xl">
        <Title order={2}>{translations["Update WebSurveyPagesTheme"]}</Title>
        <Text>
          {
            translations[
              "Updates webSurveyPagesTheme column of survey table, which is used in survey editor page."
            ]
          }
        </Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateGoogleReviewQuestionsMutation.mutate();
          }}
          loading={updateGoogleReviewQuestionsMutation.isPending}
        >
          {translations["Update WebSurveyPagesTheme"]}
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Update Web survey Theme title structure</Title>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateThemest.mutate();
          }}
          loading={updateThemest.isPending}
        >
          {translations["Update"]}
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Update Usage Stats last reset date</Title>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateUsageStats.mutate();
          }}
          loading={updateUsageStats.isPending}
        >
          {translations["Update"]}
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Update Suscription</Title>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateSubscription.mutate();
          }}
          loading={updateSubscription.isPending}
        >
          {translations["Update"]}
        </Button>
      </Stack>
    </Stack>
  );
}

export default UpdateAllThemes;
