import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useUpdateFreePlanSubscription,
  useUpdateGoogleReviewQuestions,
} from "@/backend/updations/update.query";
import useTranslations from "@/dictionaries/useTranslation";

function UpdateAllThemes() {
  const updateGoogleReviewQuestionsMutation = useUpdateGoogleReviewQuestions();
  const updateFreePlanSubscription = useUpdateFreePlanSubscription();
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

      {isDev && (
        <Stack mt="xl">
          <Title order={2}>
            {translations["Update Free plan susbcription feature"]}
          </Title>
          <Text>
            {translations["Update free plan features since it is missing"]}
          </Text>

          <Button
            ml="md"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              updateFreePlanSubscription.mutate();
            }}
            loading={updateFreePlanSubscription.isPending}
          >
            {translations["Update"]}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

export default UpdateAllThemes;
