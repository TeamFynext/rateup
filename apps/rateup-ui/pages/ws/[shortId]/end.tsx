import ThankYou from "../../public/survey/[surveyId]/end";
import { getPublicSurvey } from "../../../backend/surveys/survey.api";

export const getServerSideProps = async (context) => {
  try {
    const { shortId } = context.params;
    const {
      id: surveyId,
      surveyTeamMapId,
      kioskMode,
      redirect,
    } = await getPublicSurvey(shortId);
    return {
      props: {
        surveyId,
        surveyTeamMapId,
        kioskMode: kioskMode ? "y" : "n",
        redirect,
      },
    };
  } catch (error) {
    console.error("error in getServerSideProps");
    console.error(error);
    return {
      props: {
        surveyId: "",
        surveyTeamMapId: "",
        kioskMode: "n",
        redirect: { url: "/", time: "5", enable: true },
      },
    };
  }
};

function End({ kioskMode, surveyId, redirect }) {
  return (
    <ThankYou
      redirect={redirect}
      kioskMode={kioskMode}
      surveyIdValue={surveyId}
      fromShortUrl={true}
    />
  );
}

export default End;
