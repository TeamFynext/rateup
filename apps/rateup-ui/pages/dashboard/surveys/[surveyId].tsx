import { Group, Loader, Tabs, Space, Grid } from "@mantine/core";
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useRouter } from "next/router";
import { EditSurvey } from "../../../components/Survey/EditSurvey";
import { useSurvey } from "../../../backend/surveys/surveys.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import ShareSurvey from "../../../components/Survey/ShareSurvey/ShareSurvey";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { IconChevronDown } from "@tabler/icons-react";
import { useRouteParams } from "../../../context/RouteParamsContext";
import SurveySettings from "../../../components/Survey/Settings/SurveySettings";
import Result from "../../../components/Survey/Result/Result";
import { useUser } from "../../../context/UserContext";
import SurveyTheme from "../../../components/Survey/SurveyTheme/SurveyTheme";
import { ContainedSelection } from "../../../components/input/ContainedInput/ContainedInput";
import Heading from "../../../components/styled/Heading/Heading";
import SelectedTeamContext from "../../../context/SelectedTeam";

export enum TabEnum {
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
  const { user } = useUser();

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
  }, [survey?.title]);

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger, setaddQnTrigger] = useState(0);
  const [teamOptions, setTeamOptions] = useState([]);

  useEffect(() => {
    user?.role === "MEMBER" &&
      router.push(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/responses/${surveyId}`,
      );
  }, [user]);

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  useEffect(() => {
    if (survey) {
      setSelectedLanguage(survey?.languages?.[0]);
      let options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey]);

  useEffect(() => {
    teamOptions && setSelectedTeam(teamOptions[0]?.value);
  }, [teamOptions]);

  if (isLoading || isSurveyLoading) return <Loader />;
  if (error || surveyError) {
    console.log(error, surveyError);
    return "An error has occurred";
  }

  return (
    <SelectedLanguageContext.Provider value={{ selectedLanguage }}>
      <SelectedTeamContext.Provider value={{ selectedTeamId: selectedTeam }}>
        <StyledTabs
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as TabEnum)}
        >
          <Grid columns={10}>
            <Grid.Col span={2}>
              <Heading title={survey?.title} />
            </Grid.Col>
            <Grid.Col span={6}>
              <Tabs.List>
                <Tabs.Tab value={TabEnum.Edit}>Edit</Tabs.Tab>
                {survey?.type != "whatsapp" && (
                  <Tabs.Tab value={TabEnum.Theme}>Welcome Page</Tabs.Tab>
                )}
                <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
                <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
                <Tabs.Tab value={TabEnum.Result}>Result</Tabs.Tab>
              </Tabs.List>
            </Grid.Col>
            <Grid.Col span={2}>
              {activeTab === TabEnum.Edit ? (
                <ContainedSelection
                  ml="auto"
                  maw={100}
                  data={survey?.languages}
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                />
              ) : activeTab === TabEnum.Result ||
                activeTab === TabEnum.Share ? (
                <Group ml="auto" gap={0} w="fit-content">
                  <ContainedSelection
                    maw={130}
                    data={teamOptions}
                    value={selectedTeam}
                    onChange={setSelectedTeam}
                  />
                </Group>
              ) : null}
            </Grid.Col>
          </Grid>
          <Space h="md" />
          <Tabs.Panel
            value={TabEnum.Edit}
            style={{ background: "white", width: "100%" }}
          >
            <EditSurvey
              questions={questions}
              addQnTrigger={addQnTrigger}
              surveyLanguages={survey?.languages}
              setSelectedLanguage={setSelectedLanguage}
            />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Settings}>
            <SurveySettings surveyId={surveyId} survey={survey} />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Result}>
            <Result survey={survey} />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Share}>
            <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
          </Tabs.Panel>
          <Tabs.Panel value={TabEnum.Theme}>
            <SurveyTheme survey={survey} />
          </Tabs.Panel>
        </StyledTabs>
      </SelectedTeamContext.Provider>
    </SelectedLanguageContext.Provider>
  );
};
