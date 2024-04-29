import {
  Tabs,
  Grid,
  MultiSelect,
  Title,
  MantineProvider,
  Box,
  ScrollAreaAutosize,
} from "@mantine/core";
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import { useRouter } from "next/router";
import { EditSurvey } from "./EditSurvey";
import { useSurvey } from "../../backend/surveys/surveys.query";
import { useQuestions } from "../../backend/surveys/questions/questions.query";
import ShareSurvey from "./ShareSurvey/ShareSurvey";
import StyledTabs from "../../components/styled/StyledTabs/StyledTabs";
import { useRouteParams } from "../../context/RouteParamsContext";
import SurveySettings from "./Settings";
import Result from "./Result/Result";
import { useUser } from "../../context/UserContext";
import SurveyTheme from "./SurveyTheme";
import SurveyContext from "../../context/SurveyContext";
import { UserRole } from "../../utils/enums";
import { SubscriptionFeaturePathName, SurveyType } from "../../types/enums";
import { EditWhatsappSurvey } from "../whatsapp/surveys/WaEditSurvey";
import { whatsappTheme } from "../../config/mantineTheme";
import styles from "./SurveyId.module.css";
import { getFromSessionStorage } from "../../utils/essential";
import RateupLoader from "../Loaders/RateupLoader";
import { useSubscription } from "../../backend/subscription/subscription.query";
import { hasFeature } from "../../utils/subscription/subscription";

export enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Result = "Result",
  Settings = "Settings",
  Theme = "Theme",
}

export default function SurveyID(surveysSummary) {
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

  const { data: subscription, isPending } = useSubscription();

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [defaultLanguage, setdefaultLanguage] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger, setaddQnTrigger] = useState(0);
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [encryptionpassword, setEncryptionPassword] = useState("");
  useEffect(() => {
    if (user?.role === UserRole.MEMBER) {
      setActiveTab(TabEnum.Result);
    }
  }, [survey]);
  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [tab]);
  useEffect(() => {
    if (survey) {
      if (activeTab !== TabEnum.Result) {
        setSelectedLanguage(
          selectedLanguage ? selectedLanguage : survey?.languages?.[0],
        );
      } else {
        setSelectedLanguage("");
      }
      setdefaultLanguage(survey?.languages?.[0]);
      let options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey, activeTab]);

  useEffect(() => {
    teamOptions && setSelectedTeamId(teamOptions[0]?.value);
  }, [teamOptions]);
  const multiSelectOptions = survey?.teams?.map((team) => {
    return { value: team?.mapId, label: team?.name };
  });

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

  const savedEncryptionPassword = getFromSessionStorage(
    `${survey?.id}_ete_passkey`,
  );
  useEffect(() => {
    if (savedEncryptionPassword) {
      setEncryptionPassword(savedEncryptionPassword);
    }
  }, [savedEncryptionPassword]);

  if (isLoading || isSurveyLoading || !activeTab)
    return <RateupLoader h={"80dvh"} />;
  if (error || surveyError) {
    return <p>An error has occurred</p>;
  }
  return (
    <MantineProvider
      theme={survey?.type === SurveyType.WhatsApp ? whatsappTheme : undefined}
    >
      <SelectedLanguageContext.Provider
        value={{ selectedLanguage, defaultLanguage }}
      >
        <SurveyContext.Provider
          value={{
            selectedTeamId,
            surveyTeamMapId,
            selectedTeamName,
            filterTeams,
            setFilterTeams,
            filterTags,
            encryptionpassword,
            surveyId,
          }}
        >
          <StyledTabs
            value={activeTab}
            onChange={(tab) => setActiveTab(tab as TabEnum)}
            className={styles["survey-tabs-and-panels-container"]}
            enableRateUpBlueTheme={survey?.type !== SurveyType.WhatsApp}
          >
            <Grid columns={12} className={styles["title-tabs-container"]}>
              <Grid.Col span={3}>
                <Title
                  styles={{
                    root: {
                      fontSize: survey?.title?.length > 25 ? "20px " : "25px",
                      width: "100%",
                      // whiteSpace: "nowrap",
                      whiteSpace: "normal",
                      wordWrap: "break-word",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                >
                  {survey?.title}
                </Title>
              </Grid.Col>
              <Grid.Col span={6}>
                {user?.role !== UserRole.MEMBER && (
                  <Tabs.List>
                    <Tabs.Tab value={TabEnum.Edit}>Edit</Tabs.Tab>
                    {survey?.type !== SurveyType.WhatsApp && (
                      <Tabs.Tab value={TabEnum.Theme}>Theme</Tabs.Tab>
                    )}
                    <Tabs.Tab value={TabEnum.Settings}>Settings</Tabs.Tab>
                    <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
                    <Tabs.Tab value={TabEnum.Result}>Result</Tabs.Tab>
                  </Tabs.List>
                )}
              </Grid.Col>
              <Grid.Col span={3}>
                {activeTab === TabEnum.Result ? (
                  <MultiSelect
                    radius={"10px"}
                    searchable
                    clearable
                    data={multiSelectOptions}
                    onChange={setFilterTeams}
                    placeholder={filterTeams.length > 0 ? "" : "All Teams"}
                  />
                ) : null}
              </Grid.Col>
            </Grid>
            <Box className={styles["tab-panel-container"]}>
              <Tabs.Panel
                value={TabEnum.Edit}
                style={{ background: "white", width: "100%", height: "100%" }}
              >
                {survey?.type === SurveyType.WhatsApp ? (
                  <EditWhatsappSurvey
                    questions={questions}
                    addQnTrigger={addQnTrigger}
                    surveyLanguages={survey?.languages}
                    setSelectedLanguage={setSelectedLanguage}
                  />
                ) : (
                  <EditSurvey
                    questions={questions}
                    addQnTrigger={addQnTrigger}
                    surveyLanguages={survey?.languages}
                    setSelectedLanguage={setSelectedLanguage}
                  />
                )}
              </Tabs.Panel>
              <Tabs.Panel value={TabEnum.Settings}>
                <SurveySettings
                  surveyId={surveyId}
                  survey={survey}
                  setSelectedLanguage={setSelectedLanguage}
                  enabledModules={
                    survey?.type === SurveyType.WhatsApp
                      ? ["name", "language", "teams", "location"]
                      : [
                          "name",
                          "password",
                          "language",
                          "kiosk",
                          "teams",
                          "preview",
                          "location",
                          "notificationEmail",
                          hasFeature(
                            subscription,
                            SubscriptionFeaturePathName.Encryption,
                          ) && "endtoendencryption",
                          "redirect",
                          "uniqueDeviceResponse",
                          hasFeature(
                            subscription,
                            SubscriptionFeaturePathName.Ticket,
                          ) && "tickets",
                          hasFeature(
                            subscription,
                            SubscriptionFeaturePathName.EmailNotification,
                          ) && "enableNotificationEmail",
                        ]
                  }
                />
              </Tabs.Panel>
              <Tabs.Panel value={TabEnum.Result}>
                <Result
                  survey={survey}
                  setSelectedLanguage={setSelectedLanguage}
                  setFilterTags={setFilterTags}
                  encryptionpassword={encryptionpassword}
                  setEncryptionPassword={setEncryptionPassword}
                  subscription={subscription}
                  surveysSummary={surveysSummary}
                />
              </Tabs.Panel>
              <Tabs.Panel value={TabEnum.Share}>
                <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
              </Tabs.Panel>
              {survey?.type !== SurveyType.WhatsApp && (
                <Tabs.Panel value={TabEnum.Theme}>
                  <SurveyTheme survey={survey} />
                </Tabs.Panel>
              )}
            </Box>
          </StyledTabs>
        </SurveyContext.Provider>
      </SelectedLanguageContext.Provider>
    </MantineProvider>
  );
}
