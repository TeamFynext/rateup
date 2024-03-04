import { Button, Image } from "@mantine/core";
import { getPublicSurvey } from "../../../backend/surveys/survey.api";
import PublicSurvey from "../../public/survey/[surveyId]";
import styles from "./ws.module.css";
import Link from "next/link";
import { imagePath } from "../../../components/HomePage/pages/constants";

type SurveyViewProp = {
  shortId: string;
};

export const getServerSideProps = async (context: {
  params: SurveyViewProp;
}) => {
  try {
    const { shortId } = context.params;
    const surveyData = await getPublicSurvey(shortId);
    return { props: { survey: surveyData } };
  } catch (error) {
    console.error("error in getServerSideProps");
    console.error(error);
    return {
      props: { survey: null, error_occured: true },
    };
  }
};

// Web Survey
function Ws({ survey, error_occured }) {
  if (error_occured) {
    return (
      <div className={styles["error-page"]}>
        <Link href="/">
          <Image w={80} src={`${imagePath}/rateup-logo-blue-text.svg`} />
        </Link>
        <p className={styles["error-text"]}>
          Unable to get survey, please try again later
        </p>
        <Button
          className={styles["reload-btn"]}
          onClick={() => window.location.reload()}
        >
          Reload the page
        </Button>
      </div>
    );
  }
  return (
    <PublicSurvey survey={survey} error_occured={error_occured} fromShortUrl />
  );
}

export default Ws;
