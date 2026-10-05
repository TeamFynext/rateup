import { createFileRoute } from "@tanstack/react-router";

import { FormClosed } from "@/components/(public-facing)/ws/$shortId/FormClosed.tsx";
import { ResponseSubmitted } from "@/components/(public-facing)/ws/$shortId/ResponseSubmitted.tsx";

import PublicSurvey from "../../../../components/(public-facing)/public/survey/$surveyId/publicSurveyC.tsx";

export const Route = createFileRoute("/(public-facing)/ws/$shortId/")({
  component: Ws,
  loader: async ({ params, context }) => {
    const request = (context as { request?: Request } | undefined)?.request;

    const ip =
      request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || undefined;

    const { formClosedMessage, getPublicSurvey, isFormClosedError } =
      await import("@/backend/surveys/survey.api");
    try {
      const surveyData = await getPublicSurvey(params.shortId, ip);

      return { surveyData, errorOccured: false, formClosed: false, closedMessage: undefined };
    } catch (error) {
      // A closed form is a settled answer, not a failure to retry — kept apart from
      // `errorOccured`, whose page reloads itself several times before giving up.
      if (isFormClosedError(error)) {
        return {
          surveyData: null,
          errorOccured: false,
          formClosed: true,
          closedMessage: formClosedMessage(error),
        };
      }
      console.error(error);
      return { surveyData: null, errorOccured: true, formClosed: false, closedMessage: undefined };
    }
  },
});

// Web Survey
function Ws() {
  const { surveyData, errorOccured, formClosed, closedMessage } = Route.useLoaderData();

  if (formClosed) {
    return <FormClosed message={closedMessage} />;
  }

  if (errorOccured) {
    return <PublicSurvey survey={null} error_occured fromShortUrl />;
  }

  if (surveyData?.message === "ALREADY_SUBMITTED") {
    return <ResponseSubmitted />;
  }

  return <PublicSurvey survey={surveyData} error_occured={false} fromShortUrl />;
}
