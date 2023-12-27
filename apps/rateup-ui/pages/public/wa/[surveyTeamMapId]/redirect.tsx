import { useRouter } from "next/router";
import { usePublicSurvey } from "../../../../backend/surveys/surveys.query";
import { generateWaSurveyUrl } from "../../../../utils/whatsapp/wa_url";
import { tokenizeIp } from "../../../../backend/whatsapp/whatsapp.api";

export default function () {
  const router = useRouter();
  const surveyTeamMapId: string = router.query.surveyTeamMapId as string;

  const { data: survey, isLoading, isError } = usePublicSurvey(surveyTeamMapId);
  if (isError) return <div>Survey not found</div>;

  if (survey) {
    if (survey.getLocation) {
      tokenizeIp().then((res) => {
        router.push(generateWaSurveyUrl(`${surveyTeamMapId} ${res.token}`));
      });
    } else {
      router.push(generateWaSurveyUrl(surveyTeamMapId));
    }
  }
  if (isLoading) return <div>Redirecting to whatsapp...</div>;
}
