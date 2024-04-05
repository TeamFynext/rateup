import { useRouter } from "next/router";
import {
  usePhoneFromSurveyTeamMapId,
  usePublicSurvey,
} from "../../../../backend/surveys/surveys.query";
import { generateWaSurveyShareUrl } from "../../../../utils/whatsapp/wa_url";
import { tokenizeIp } from "../../../../backend/whatsapp/whatsapp.api";

export default function Redirect({ shortId = null, tag = null }) {
  const router = useRouter();

  const surveyTeamMapIdOrShortId: string = shortId
    ? shortId
    : (router.query.surveyTeamMapId as string);

  // TODO: we could just pass the shortId and remove the need of fetching the full survey
  const {
    data: survey,
    isLoading,
    isError,
  } = usePublicSurvey(surveyTeamMapIdOrShortId);

  const { data: phoneRes } = usePhoneFromSurveyTeamMapId(
    surveyTeamMapIdOrShortId,
  );

  if (isError) return <div>Survey not found</div>;
  const tagInLink = tag ? `?t=${tag}` : "";

  if (survey && phoneRes?.phone) {
    const phone = phoneRes.phone.replace("+", "").replaceAll(" ", "");
    const teamMapId = survey.surveyTeamMapId;
    if (survey.getLocation) {
      tokenizeIp().then((res) => {
        router.push(
          generateWaSurveyShareUrl(
            phone,
            `${teamMapId} ${res.token}${tagInLink}`,
          ),
        );
      });
    } else {
      router.push(generateWaSurveyShareUrl(phone, `${teamMapId}${tagInLink}`));
    }
  }
  if (isLoading) return <div>Redirecting to whatsapp...</div>;
}
