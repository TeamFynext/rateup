import { Center, Loader, Select } from "@mantine/core";
import { useRouter } from "next/router";
import { useState } from "react";
import { usePublicSurvey } from "../../../../backend/surveys/surveys.query";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurvey";
import { TakeSurveyLayout } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayout";

export default function Page() {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { isError, isLoading, data: survey } = usePublicSurvey(surveyId);
  const [selectedLanguage, setSelectedLanguage] = useState("");


  if (isError) return <div>Something went wrong</div>;
  if (isLoading) return <Loader />;
  if (!selectedLanguage) {
    return (
      <SelectLang
        languages={survey.languages}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
      />
    );
  }
  return (
      <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
        <TakeSurvey />
      </SelectedLanguageContext.Provider>
  );
}

function SelectLang({ languages, selectedLanguage, setSelectedLanguage }) {
  return (
    <Center sx={{ height: "80vh" }}>
      <Select
        data={languages}
        label="Select language"
        placeholder="Select language"
        value={selectedLanguage}
        onChange={setSelectedLanguage}
      />
    </Center>
  );
}

Page.getLayout = function getLayout(page) {
  return <TakeSurveyLayout>{page}</TakeSurveyLayout>;
};
