import ThankYou from "../../public/survey/[surveyId]/end";
import { getPublicSurvey } from "../../../backend/surveys/survey.api";

export const getServerSideProps = async (context) => {
  try {
    const { shortId } = context.params;

    const { gift } = context.query;
    const decodedParam = atob(gift ?? "");
    const params = new URLSearchParams(decodedParam);
    const name = params.get("name");
    const image = params.get("image");
    const error = params.get("error");

    const {
      id: surveyId,
      surveyTeamMapId,
      kioskMode,
      redirect,
      webSurveyThemeId,
    } = await getPublicSurvey(shortId);
    return {
      props: {
        surveyId,
        surveyTeamMapId,
        kioskMode: kioskMode ? "y" : "n",
        redirect,
        webSurveyThemeId,
        gift: {
          name,
          image,
          error: error?.toLowerCase() === "true",
        },
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
        gift: {
          name: "",
          image: "",
          error: false,
        },
      },
    };
  }
};

function End({ kioskMode, surveyId, redirect, webSurveyThemeId, gift }) {
  return (
    <ThankYou
      redirect={redirect}
      kioskMode={kioskMode}
      surveyIdValue={surveyId}
      fromShortUrl={true}
      surveyThemeId={webSurveyThemeId}
      gift={gift}
    />
  );
}

export default End;
