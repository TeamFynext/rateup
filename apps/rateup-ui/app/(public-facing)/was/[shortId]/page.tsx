import Redirect from "@/app/(public-facing)/public/wa/[surveyTeamMapId]/redirect/page";

import { getShareUrlFromSurveyTeamMapId } from "../../../../backend/whatsapp/whatsapp.api";

async function Was(props) {
  const params = await props?.params;
  const query = await props?.query;
  const surveyTeamMapIdOrShortId: string = params.shortId
    ? params.shortId
    : params.surveyTeamMapId;
  const data = await getShareUrlFromSurveyTeamMapId(surveyTeamMapIdOrShortId);
  return (
    <Redirect
      tag={query?.tag ?? null}
      res={data}
      surveyTeamMapIdOrShortId={surveyTeamMapIdOrShortId}
    />
  );
}

export default Was;
