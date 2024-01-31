import {
  getPublicSurvey,
  getPublicSurveyGoogleLink,
} from "../../../../backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "../../../../backend/team/reviewSuggestion/reviewSuggestion.api";
import GoogleReview from "../../../../components/Survey/TakeSurvey/GoogleReview";

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
  propsToPass.orgLogoUrl =
    orgLogo && orgLogo !== "REMOVED_PHOTO" ? orgLogoUrl : null;

  return {
    props: propsToPass,
  };
}

function ReviewUsOnGoogle({ googleLink, reviews, orgLogoUrl }) {
  return (
    <GoogleReview
      googleLink={googleLink}
      reviewSuggestions={reviews}
      orgLogoUrl={orgLogoUrl}
    />
  );
}

export default ReviewUsOnGoogle;
