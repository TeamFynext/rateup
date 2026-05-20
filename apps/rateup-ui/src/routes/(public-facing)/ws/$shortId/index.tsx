import { createFileRoute } from "@tanstack/react-router";

import { getPublicSurvey } from "@/backend/surveys/survey.api";

import PublicSurvey from "../../../../components/(public-facing)/public/survey/$surveyId/publicSurveyC.tsx";
import { ResponseSubmitted } from "@/components/(public-facing)/ws/$shortId/ResponseSubmitted.tsx";

export const Route = createFileRoute("/(public-facing)/ws/$shortId/")({
  component: Ws,
  loader: async ({ params, context }) => {
    const request = (context as { request?: Request } | undefined)?.request;

    const ip =
      request?.headers.get("x-forwarded-for") ||
      request?.headers.get("x-real-ip") ||
      undefined;

    try {
      const surveyData = await getPublicSurvey(params.shortId, ip);

      return { surveyData, errorOccured: false };
    } catch (error) {
      console.error(error);
      return { surveyData: null, errorOccured: true };
    }
  },
});

// Web Survey
function Ws() {
  const { surveyData, errorOccured } = Route.useLoaderData();

  if (errorOccured) {
    return <PublicSurvey survey={null} error_occured fromShortUrl />;
  }

  if (surveyData?.message === "ALREADY_SUBMITTED") {
    return <ResponseSubmitted />;
  }

  return (
    <PublicSurvey survey={surveyData} error_occured={false} fromShortUrl />
  );
}
