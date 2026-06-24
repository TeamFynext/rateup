import { createFileRoute } from "@tanstack/react-router";

import { getPublicSurvey } from "@/backend/surveys/survey.api";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants.ts";

import PublicSurvey from "../../../../../components/(public-facing)/public/survey/$surveyId/publicSurveyC.tsx";

const DEFAULT_OG_IMAGE = rateupLogoStackedWhiteTransparent;

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
  loader: ({ params }) => getPublicSurvey(params.surveyId),
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
      title: surveyTitle,
      meta: [
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
function WsPublic() {
  const surveyData = Route.useLoaderData();

  return <PublicSurvey survey={surveyData} error_occured={false} fromShortUrl={false} />;
}
