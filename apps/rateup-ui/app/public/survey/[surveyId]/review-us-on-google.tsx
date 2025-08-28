import {
  getPublicSurvey,
  getPublicSurveyGoogleLink,
} from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";
import GoogleReview from "../../../../components/Survey/TakeSurvey/GoogleReview";

//TODO REMOVE THIS PAGE AFTER TESTING  --  CURRENTLY MERGED WITHIN PUBLIC SURVEY PAGE

export async function getServerSideProps(context) {
  const { surveyId } = context.params;

  let propsToPass: any = {};
  const { orgLogo } = await getPublicSurvey(surveyId);

  const [googleLink, reviews] = await Promise.all([
    getPublicSurveyGoogleLink(surveyId),
    getPublicReviewsBySurveyTeamMapId(surveyId),
  ]);

  const orgLogoUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${orgLogo}`;
  propsToPass.googleLink = googleLink;
  propsToPass.reviews = reviews;
  // TODO: add surveyTeamMapId
  propsToPass.orgLogoUrl =
    orgLogo && orgLogo !== "REMOVED_PHOTO" ? orgLogoUrl : null;

  return {
    props: propsToPass,
  };
}

export function ReviewUsOnGoogle({
  googleLink,
  reviews,
  orgLogoUrl,
  surveyTeamMapId,
}) {
  return (
    <GoogleReview
      reviewSuggestions={reviews}
      orgLogoUrl={orgLogoUrl}
      surveyTeamMapId={surveyTeamMapId}
      survey={null}
    />
  );
}

export default ReviewUsOnGoogle;
