import { PageType } from "@/types/enums";

import { getPublicSurvey } from "../../../backend/surveys/survey.api";
import ThankYou from "../../public/survey/[surveyId]/end";

export const getServerSideProps = async (context) => {
  try {
    const { shortId } = context.params;

    const { gift } = context.query;
    const decodedString = atob(gift ?? "");
    const decodedParam = decodeURIComponent(decodedString ?? "");
    const params = new URLSearchParams(decodedParam);
    const name = params.get("name");
    const image = params.get("image");
    const error = params.get("error");
    const price = params.get("price");

    const {
      id: surveyId,
      surveyTeamMapId,
      kioskMode,
      redirect,
      webSurveyTheme: { theme: surveyThemeData },
      webSurveyPagesTheme: pagesThemeData,
      questions,
    } = await getPublicSurvey(shortId);

    const defaultTitleSubtitleTexts = {
      titleText: `<h3 style="text-align: center">Thank you</h3><p style="text-align: center">Thank you for taking the survey</p>`,
    };

    const texts = questions?.find(
      (questionObj) => questionObj.type === PageType.ThankYou,
    );

    return {
      props: {
        surveyId,
        surveyTeamMapId,
        kioskMode: kioskMode ? "y" : "n",
        redirect,
        surveyThemeData,
        pagesThemeData,
        gift: {
          name,
          image,
          error,
          price,
        },
        titleText: texts?.titleText || defaultTitleSubtitleTexts.titleText,
        subtitleText: texts?.subtitleText || null,
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

function End({
  kioskMode,
  surveyId,
  redirect,
  surveyThemeData,
  pagesThemeData,
  titleText,
  subtitleText,
}) {
  return (
    <ThankYou
      redirect={redirect}
      kioskMode={kioskMode}
      surveyIdValue={surveyId}
      fromShortUrl={true}
      surveyThemeData={surveyThemeData}
      pagesThemeData={pagesThemeData}
      titleText={titleText}
      subtitleText={subtitleText}
    />
  );
}

export default End;
