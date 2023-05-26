import { Box, Group, Loader, Select, Stack, Tabs, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useRouter } from "next/router";
import { EditSurvey } from "../../../components/Survey/EditSurvey";
import { Responses } from "../../../components/Survey/Response/Responses";
import { useSurvey } from "../../../api/surveys/surveys.query";
import { useQuestions } from "../../../api/surveys/questions/questions.query";
import ShareSurvey from "../../../components/Survey/ShareSurvey/ShareSurvey";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Responses = "Responses",
}
export default () => {
  const router = useRouter();
  const { surveyId } = router.query;

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);

  const { isLoading, error, data: questions } = useQuestions(surveyId);

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);

  useEffect(() => {
    if (survey) {
      setSelectedLanguage(survey.languages[0]);
    }
  }, [survey]);

  if (isLoading || isSurveyLoading) return <Loader />;
  if (error || surveyError) {
    console.log(error, surveyError);
    return "An error has occurred";
  }

  return (
    <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
      <Stack sx={{ height: "100%" }}>
        <Tabs
          value={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabEnum)}
        >
          <Group position="apart">
            <Title>{survey.title}</Title>

            <Tabs.List
              sx={{
                position: "absolute",
                width: "fit-content",
                left: 0,
                right: 0,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <Tabs.Tab value={TabEnum.Edit}>Edit</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Responses}>Responses</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value={TabEnum.Edit}>
              <Select
                data={survey.languages}
                value={selectedLanguage}
                onChange={setSelectedLanguage}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Responses}>
              <div></div>
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Share}>
              <div></div>
            </Tabs.Panel>
          </Group>

          <Tabs.Panel value={TabEnum.Edit}>
            {/** TODO: Remove fixed height and make this responsive */}
            <Box sx={{ display: "flex", gap: 8, height: "70vh" }}>
              <EditSurvey questions={questions} />
            </Box>
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Responses}>
            <Responses />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Share}>
            <ShareSurvey />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </SelectedLanguageContext.Provider>
  );
};
