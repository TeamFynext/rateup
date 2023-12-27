import { Loader, Tabs, Space, MantineProvider, Grid } from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useQuestions } from "../../../../backend/surveys/questions/questions.query";
import { useSurvey } from "../../../../backend/surveys/surveys.query";
import Result from "../../../../components/Survey/Result/Result";
import ShareSurvey from "../../../../components/Survey/ShareSurvey/ShareSurvey";
import StyledTabs from "../../../../components/styled/StyledTabs/StyledTabs";
import { useRouteParams } from "../../../../context/RouteParamsContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { useUser } from "../../../../context/UserContext";
import { EditWhatsappSurvey } from "../../../../components/whatsapp/surveys/WaEditSurvey";
import { whatsappTheme } from "../../../../config/mantineTheme";
import SurveySettings from "../../../../components/Survey/Settings/SurveySettings";
import { ContainedSelection } from "../../../../components/input/ContainedInput/ContainedInput";
import Heading from "../../../../components/styled/Heading/Heading";
import SurveyContext from "../../../../context/SurveyContext";
import { getTeamOptionsFromSurvey } from "../../../../utils/team/surveyTeam";

enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Result = "Result",
  Settings = "Settings",
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
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger, setaddQnTrigger] = useState(0);
  // SurveyContext
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [filterTags, setFilterTags] = useState([]);
  useEffect(() => {
    if (user?.role === "MEMBER") {
      router.push(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/whatsapp/surveys/responses/${surveyId}`,
      );
    }
  }, [user]);

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  useEffect(() => {
    if (survey) {
      setSelectedLanguage(survey?.languages?.[0]);
    }
  }, [survey]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(
        survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId,
      );
      setSelectedTeamName(
        survey?.teams?.find((team) => team.id === selectedTeamId)?.name,
      );
    }
  }, [selectedTeamId]);

  if (error || surveyError) {
    console.log(error, surveyError);
    return "An error has occurred";
  }
  if (isLoading || isSurveyLoading || !survey) return <Loader />;
  const teamOptions = getTeamOptionsFromSurvey({ survey });
  if (!selectedTeamId) setSelectedTeamId(teamOptions[0].value);

  // TODO: create reusable survey header (title + tabs + language selector)
  return (
    <MantineProvider theme={whatsappTheme}>
      <SelectedLanguageContext.Provider
        value={{ selectedLanguage, defaultLanguage: "" }}
      >
        <SurveyContext.Provider
          value={{
            filterTags,
            selectedTeamId,
            surveyTeamMapId,
            selectedTeamName,
            filterTeams: [],
          }}
        >
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
                  <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
                  <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
                  <Tabs.Tab value={TabEnum.Result}>Result</Tabs.Tab>
                </Tabs.List>
              </Grid.Col>
              <Grid.Col span={2}>
                {activeTab === TabEnum.Edit ? (
                  <ContainedSelection
                    allowDeselect={false}
                    ml="auto"
                    data={survey?.languages}
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                  />
                ) : [TabEnum.Result, TabEnum.Share].includes(activeTab) ? (
                  <ContainedSelection
                    allowDeselect={false}
                    ml="auto"
                    maw={150}
                    data={teamOptions}
                    value={selectedTeamId}
                    onChange={setSelectedTeamId}
                  />
                ) : null}
              </Grid.Col>
            </Grid>
            <Space h="lg" />
            <Tabs.Panel
              value={TabEnum.Edit}
              style={{ background: "white", width: "100%" }}
            >
              <EditWhatsappSurvey
                questions={questions}
                addQnTrigger={addQnTrigger}
                surveyLanguages={survey?.languages}
                setSelectedLanguage={setSelectedLanguage}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Settings}>
              <SurveySettings
                survey={survey}
                surveyId={survey?.id}
                enabledModules={["name", "language", "teams", "location"]}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Result}>
              <Result
                survey={survey}
                setSelectedLanguage={null}
                setFilterTags={setFilterTags}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Share}>
              <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
            </Tabs.Panel>
            {/* TODO  fix mantine issue and Enable - TODO VERIFY MANTINE*/}
          </StyledTabs>
        </SurveyContext.Provider>
      </SelectedLanguageContext.Provider>
    </MantineProvider>
  );
};
