import { PageType } from "@/types/enums";
import ThankYou from "@/app/public/survey/[surveyId]/end";
import { getPublicSurvey } from "@/backend/surveys/survey.api";

async function End(props) {
  const { shortId } = await props.params;
  const {
    id: surveyId,
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
  return (
    <ThankYou
      redirect={redirect}
      kioskMode={kioskMode ? "y" : "n"}
      surveyIdValue={surveyId}
      fromShortUrl={true}
      surveyThemeData={surveyThemeData}
      pagesThemeData={pagesThemeData}
      titleText={texts?.titleText || defaultTitleSubtitleTexts.titleText}
      subtitleText={texts?.subtitleText || null}
    />
  );
}

export default End;
