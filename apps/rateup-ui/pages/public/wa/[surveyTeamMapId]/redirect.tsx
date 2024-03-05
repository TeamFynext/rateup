import { useRouter } from "next/router";
import { usePublicSurvey } from "../../../../backend/surveys/surveys.query";
import { generateWaSurveyUrl } from "../../../../utils/whatsapp/wa_url";
import { tokenizeIp } from "../../../../backend/whatsapp/whatsapp.api";

export default function Redirect({ shortId = null, tag = null }) {
  const router = useRouter();

  const surveyTeamMapIdOrShortId: string = shortId
    ? shortId
    : (router.query.surveyTeamMapId as string);

  const {
    data: survey,
    isLoading,
    isError,
  } = usePublicSurvey(surveyTeamMapIdOrShortId);

  if (isError) return <div>Survey not found</div>;
  const tagInLink = tag ? `?t=${tag}` : "";
  if (survey) {
    const teamMapId = survey.surveyTeamMapId;
    if (survey.getLocation) {
      tokenizeIp().then((res) => {
        router.push(
          generateWaSurveyUrl(`${teamMapId} ${res.token}${tagInLink}`),
        );
      });
    } else {
      router.push(generateWaSurveyUrl(`${teamMapId}${tagInLink}`));
    }
  }
  if (isLoading) return <div>Redirecting to whatsapp...</div>;
}
