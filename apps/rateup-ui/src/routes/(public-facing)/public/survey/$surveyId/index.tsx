import { createFileRoute } from "@tanstack/react-router";

import {
  formClosedMessage,
  getPublicSurvey,
  isFormClosedError,
} from "@/backend/surveys/survey.api";
import { FormClosed } from "@/components/(public-facing)/ws/$shortId/FormClosed.tsx";
import { rateupLogoOg } from "@/utils/constants.ts";

import PublicSurvey from "../../../../../components/(public-facing)/public/survey/$surveyId/publicSurveyC.tsx";

const DEFAULT_OG_IMAGE = rateupLogoOg;

const MIME_TYPES_FOR_IMAGE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const getMimeTypeFromPath = (path?: string) => {
  const extension = path?.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (!extension) return "image/png";
  return MIME_TYPES_FOR_IMAGE[extension] ?? "image/png";
};

export const Route = createFileRoute("/(public-facing)/public/survey/$surveyId/")({
  loader: async ({ params }) => {
    try {
      return await getPublicSurvey(params.surveyId);
    } catch (error) {
      // Only a closed form is answered here; every other failure still throws to the
      // router's error boundary, which is where it was handled before.
      if (isFormClosedError(error)) {
        return { formClosed: true, closedMessage: formClosedMessage(error) } as const;
      }
      throw error;
    }
  },
  component: WsPublic,
  head: ({ params, loaderData }) => {
    const survey = (loaderData ?? {}) as {
      id?: string;
      title?: string;
      orgLogo?: string;
    };

    const surveyTitle = survey.title ?? "Survey";
    const surveyId = survey.id ?? params.surveyId;
    const ogImage = survey.orgLogo
      ? `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${survey.orgLogo}`
      : DEFAULT_OG_IMAGE;
    const surveyDescription = `Take the ${surveyTitle} survey on Rateup.`;

    return {
      meta: [
        // Must be a `meta` entry — TanStack ignores a top-level `title` key, so this page
        // rendered the root default title.
        { title: surveyTitle },
        { name: "description", content: surveyDescription },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Rateup" },
        {
          property: "og:url",
          content: `https://rateup.app/public/survey/${surveyId}`,
        },
        { property: "og:title", content: surveyTitle },
        { property: "og:description", content: surveyDescription },
        { property: "og:image", content: ogImage },
        {
          property: "og:image:type",
          content: getMimeTypeFromPath(survey.orgLogo),
        },
        { property: "og:image:width", content: "1086" },
        { property: "og:image:height", content: "832" },
        { property: "og:image:alt", content: "Org Icon" },
      ],
    };
  },
});

// Web Survey
/** The sentinel the loader returns in place of a survey when the form is closed. */
function isClosedForm(data: unknown): data is { formClosed: true; closedMessage?: string } {
  return Boolean((data as { formClosed?: boolean } | null)?.formClosed);
}

function WsPublic() {
  const surveyData = Route.useLoaderData();

  if (isClosedForm(surveyData)) {
    return <FormClosed message={surveyData.closedMessage} />;
  }

  return <PublicSurvey survey={surveyData} error_occured={false} fromShortUrl={false} />;
}
