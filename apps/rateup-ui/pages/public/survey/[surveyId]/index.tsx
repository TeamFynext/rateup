import { Center, Select, Title, Stack } from "@mantine/core";
import { useState } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurveyComponent";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import { useMediaQuery } from "@mantine/hooks";
import { getPublicSurvey } from "../../../../backend/surveys/survey.api";
import { getPublicwelcomeTheme } from "../../../../backend/WelcomeTheme/welcometheme.api";

type SurveyViewProp = {
  surveyId: string;
};

export const getServerSideProps = async (context: {
  params: SurveyViewProp;
}) => {
  const params = context.params;
  const surveyData = await getPublicSurvey(params.surveyId);
  const surveyThemeData = await getPublicwelcomeTheme(params.surveyId);
  return { props: { survey: surveyData, surveyThemeData: surveyThemeData } };
};
export default function Page({ survey, surveyThemeData }) {
  const [selectedLanguage, setSelectedLanguage] = useState("");

  if (!selectedLanguage) {
    if (survey?.languages?.length > 1) {
      return (
        <SelectLang
          languages={survey?.languages}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />
      );
    } else {
      setSelectedLanguage(survey?.languages[0]);
    }
  }
  return (
    <TakeSurveyLayoutWeb survey={survey} surveyThemeData={surveyThemeData}>
      <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
        <TakeSurvey />
      </SelectedLanguageContext.Provider>
    </TakeSurveyLayoutWeb>
  );
}

function SelectLang({ languages, selectedLanguage, setSelectedLanguage }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <>
      <Stack pl="7vw" pt="10vh">
        <Title fw={100}> Choose Your language and</Title>
        <Title> let's get started!</Title>
      </Stack>

      <Center style={{ height: isMobile ? "40vh" : "45vh" }}>
        <Select
          data={languages}
          placeholder="Select language"
          value={selectedLanguage}
          onChange={setSelectedLanguage}
        />
      </Center>
    </>
  );
}
