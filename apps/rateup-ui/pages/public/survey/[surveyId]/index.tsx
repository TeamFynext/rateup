import { Center, Loader, Select, Title, Stack} from "@mantine/core";
import { useRouter } from "next/router";
import { useState } from "react";
import { usePublicSurvey } from "../../../../backend/surveys/surveys.query";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import TakeSurvey from "../../../../components/Survey/TakeSurvey/TakeSurvey";
import { TakeSurveyLayoutWeb } from "../../../../components/Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import { useMediaQuery } from '@mantine/hooks';
import { GetServerSidePropsContext } from "next";
import supertokensNode from "supertokens-node";
import { backendConfig } from "../../../../config/backendConfig";
import { getPublicSurveyWithCustomToken, updateSurveyStartedWithCustomToken, updateSurveyVisitedWithCustomToken } from "../../../../backend/surveys/survey.api";

export default function Page( {surveyData: surveyInitial} ) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [selectedLanguage, setSelectedLanguage] = useState("");

  const { isError, isLoading, data: survey } = usePublicSurvey(surveyId, surveyInitial);

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
      <Title fw={100}> Choose Your language and</Title>
      <Title > let's get started!</Title>
    </Stack>

    <Center style={{ height: isMobile ? '40vh' : '45vh' }}>  
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig())
    const { surveyId } = context.params as { surveyId: string };

    let accessToken = context.req.cookies['st-access-token'] || context.req.cookies['sAccessToken']
    if (!accessToken) {
      return { props: { surveyData: [] } }
    }

    const surveyData = await getPublicSurveyWithCustomToken(accessToken, { surveyId })

    if(surveyData?.welcomePageEnabled){
      await updateSurveyVisitedWithCustomToken(accessToken, surveyId )
    }else{  //count visited and started for - no welcome page case
      await updateSurveyVisitedWithCustomToken(accessToken, surveyId )
      await updateSurveyStartedWithCustomToken(accessToken, surveyId )
    }

    return {
      props: {
        surveyData: surveyData || null
      },
    }

  } catch (err) {
    console.log(err)
    return {
      props: {
        surveyData: []
      },
    }
  }
}