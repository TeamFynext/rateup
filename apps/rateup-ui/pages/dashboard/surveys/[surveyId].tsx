import { Box, Group, Loader, Select, Stack, Tabs, Title, Space, Badge } from "@mantine/core";
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useRouter } from "next/router";
import { EditSurvey } from "../../../components/Survey/EditSurvey";
import { useSurvey } from "../../../backend/surveys/surveys.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import ShareSurvey from "../../../components/Survey/ShareSurvey/ShareSurvey";
import StyledTabs from "./StyledTabs";
import { RateupButtonBlackOutline, RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { useRouteParams } from "../../../context/RouteParamsContext";
import SurveySettings from "../../../components/Survey/Settings/SurveySettings";
import Result from "../../../components/Survey/Result/Result";
import { useUser } from "../../../context/UserContext";
import SurveyTheme from "../../../components/Survey/SurveyTheme/SurveyTheme";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Result = "Result",
  Settings = "Settings",
  Theme = "Theme",
}
export default () => {
  const router = useRouter();
  const { surveyId } = router.query;
  const { tab } = router.query;
  const { user, setUser } = useUser();

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);

  const { isLoading, error, data: questions } = useQuestions(surveyId);

  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title])

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger, setaddQnTrigger] = useState(0)

  useEffect(() => {
    user?.role === 'MEMBER' && router.push(
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/responses/${surveyId}`
    )
  }, [user])
  

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  useEffect(() => {
    if (survey) {
      setSelectedLanguage(survey.languages[0]);
    }
  }, [survey]);

  if (isLoading || isSurveyLoading) return <Loader />;
  if (error || surveyError) {
    // console.log(error, surveyError);
    return "An error has occurred";
  }

  return (
    <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
      <Stack sx={{ height: "100%" }} >
        <StyledTabs
          value={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabEnum)}
        >
          <Group position="apart">
            <Title order={1} mb="sm">{survey.title}</Title>
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
              <Tabs.Tab value={TabEnum.Theme}>Welcome Page</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
              <Tabs.Tab value={TabEnum.Result}>Result</Tabs.Tab>
              
            </Tabs.List>

            <Tabs.Panel value={TabEnum.Edit}>
              <Group>
            <Badge color={survey?.type=="web"?"blue":"green"}>{survey.type}</Badge>

                <Select
                    data={survey.languages}
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                  />

                {/* <RateupButtonPrimary onClick={() => {setaddQnTrigger(addQnTrigger+1)}} title={"Add Question"}
                        rightIcon={<IconPlus
                          size="1rem" />}
                          size="md"
                    /> */}
              </Group>
  
            </Tabs.Panel>

            <Tabs.Panel value={TabEnum.Settings}>
            <div></div>
            </Tabs.Panel>
            
            <Tabs.Panel value={TabEnum.Share}>
              <div></div>
            </Tabs.Panel>

            <Tabs.Panel value={TabEnum.Result}>
                <RateupButtonBlackOutline 
                  title={"All"} 
                  radius={"lg"}
                  size="md"
                  rightIcon={<IconChevronDown
                    size="1rem" />}
                />
                <RateupButtonPrimary
                        title={"Filter"}
                        variant="subtle"
                        rightIcon={<IconChevronDown
                            size="1rem" />}
                    />
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Theme}>
              <div></div>
            </Tabs.Panel>
          </Group>

          <Space h="xl" />
          
          <Tabs.Panel value={TabEnum.Edit}>
            {/** TODO: Remove fixed height and make this responsive */}
            <Box sx={{ display: "flex", gap: 30, height: "70vh" }}>
              <EditSurvey questions={questions} addQnTrigger={addQnTrigger} surveyType={survey.type}/>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value={TabEnum.Settings}>
            <SurveySettings surveyId={surveyId} survey={survey}  />
          </Tabs.Panel>

          <Tabs.Panel value={TabEnum.Result}>
            <Result survey={survey}/>
          </Tabs.Panel>

          <Tabs.Panel value={TabEnum.Share}>
            <ShareSurvey survey={survey}/>
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Theme}>
            <SurveyTheme survey={survey}/>
          </Tabs.Panel>
         
          
        </StyledTabs>
      </Stack>
      {/* <Title>hello google</Title> */}
    </SelectedLanguageContext.Provider>
  );
};
