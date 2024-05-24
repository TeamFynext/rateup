// import { useRouter } from "next/router";
import Redirect from "../../public/wa/[surveyTeamMapId]/redirect";
import { getShareUrlFromSurveyTeamMapId } from "../../../backend/whatsapp/whatsapp.api";

interface ServerSidePropsContext {
  params: {
    shortId: string;
    tag: string;
    surveyTeamMapId: string;
  };
}

// Whatsapp survey
export const getServerSideProps = async ({
  params,
}: ServerSidePropsContext) => {
  const surveyTeamMapIdOrShortId: string = params.shortId
    ? params.shortId
    : params.surveyTeamMapId;
  try {
    const data = await getShareUrlFromSurveyTeamMapId(surveyTeamMapIdOrShortId);
    return {
      props: {
        res: data,
        tag: params?.tag ?? null,
        surveyTeamMapIdOrShortId: surveyTeamMapIdOrShortId,
      },
    };
  } catch (error) {
    return {
      props: {
        res: { title: "flow", orgName: "rateup" },
        tag: params?.tag ?? null,
        surveyTeamMapIdOrShortId: surveyTeamMapIdOrShortId,
      },
    };
  }
};
function Was({ res, tag = null, surveyTeamMapIdOrShortId }) {
  return (
    <Redirect
      tag={tag}
      res={res}
      surveyTeamMapIdOrShortId={surveyTeamMapIdOrShortId}
    />
  );
}

export default Was;
