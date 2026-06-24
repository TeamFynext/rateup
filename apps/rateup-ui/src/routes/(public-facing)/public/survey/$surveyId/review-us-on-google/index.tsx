import { createFileRoute } from "@tanstack/react-router";

import { getPublicSurvey, getPublicSurveyGoogleLink } from "@/backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "@/backend/team/reviewSuggestion/reviewSuggestion.api";
import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview/index.tsx";
import type { ReviewSuggestion } from "@/types/global";

export const Route = createFileRoute(
  "/(public-facing)/public/survey/$surveyId/review-us-on-google/",
)({
  component: ReviewUsOnGoogle,
  loader: async ({ params }) => {
    const { surveyId } = params;

    const propsToPass: {
      googleLink?: string;
      reviews?: {
        reviews: ReviewSuggestion[];
        reviewLink: string;
      };
      orgLogoUrl?: string | null;
      surveyTeamMapId?: string;
    } = {};
    const { orgLogo } = await getPublicSurvey(surveyId);

    const [googleLink, reviews] = await Promise.all([
      getPublicSurveyGoogleLink(surveyId),
      getPublicReviewsBySurveyTeamMapId(surveyId),
    ]);

    const orgLogoUrl = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${orgLogo}`;
    propsToPass.googleLink = googleLink;
    propsToPass.reviews = reviews;
    propsToPass.orgLogoUrl = orgLogo && orgLogo !== "REMOVED_PHOTO" ? orgLogoUrl : null;
    return propsToPass;
  },
});

// TODO REMOVE THIS PAGE AFTER TESTING  --  CURRENTLY MERGED WITHIN PUBLIC SURVEY PAGE

function ReviewUsOnGoogle(_props) {
  const propsToPass = Route.useLoaderData();

  return (
    <GoogleReview
      reviewSuggestions={propsToPass?.reviews}
      orgLogoUrl={propsToPass?.orgLogoUrl}
      surveyTeamMapId={propsToPass?.surveyTeamMapId}
      survey={null}
    />
  );
}
