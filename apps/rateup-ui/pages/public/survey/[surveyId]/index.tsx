import { Center, Loader, Select, Title, Stack} from "@mantine/core";
import { useRouter } from "next/router";
import { useState } from "react";
import { usePublicSurvey } from "../../../../backend/surveys/surveys.query";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurvey";
import { TakeSurveyLayout } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayout";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import { useMediaQuery } from '@mantine/hooks';

export default function Page() {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { isError, isLoading, data: survey } = usePublicSurvey(surveyId);
  const [selectedLanguage, setSelectedLanguage] = useState("");


  if (isError) return <div>Something went wrong</div>;
  if (isLoading) return <Loader />;
  if (!selectedLanguage) {
    if(survey?.languages?.length>1){
      return (
        <SelectLang
          languages={survey?.languages}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />
      );
    }else{
      setSelectedLanguage(survey?.languages[0])
    }
  }
  return (
      <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
        <TakeSurvey />
      </SelectedLanguageContext.Provider>
  );
}

function SelectLang({ languages, selectedLanguage, setSelectedLanguage }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <>
    <Stack pl="7vw" pt="10vh">
      <Title weight={100}> Choose Your language and</Title>
      <Title > let's get started!</Title>
    </Stack>

    <Center sx={{ height: isMobile ? '40vh' : '45vh' }}>  
    {/* TODO for mobile design 80vh */}
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

Page.getLayout = function getLayout(page) {
  return <TakeSurveyLayoutWeb>{page}</TakeSurveyLayoutWeb>;
};
