import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { MantineProvider, Portal } from "@mantine/core";

import { useNavControlContext } from "@/context/NavControlContext";
import { SurveyContextProvider } from "@/context/SurveyObjContext";

import { useSubscription } from "../../backend/subscription/subscription.query";
import { useQuestions } from "../../backend/surveys/questions/questions.query";
import {
  useGetSurveyVariables,
  useSurvey,
} from "../../backend/surveys/surveys.query";
import { whatsappTheme } from "../../config/mantineTheme";
import { useRouteParams } from "../../context/RouteParamsContext";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import SurveyContext from "../../context/SurveyContext";
import { useUser } from "../../context/UserContext";
import { SurveyType } from "../../types/enums";
import { UserRole } from "../../utils/enums";
import { getFromSessionStorage } from "../../utils/essential";
import RateupLoader from "../Loaders/RateupLoader";
import TabPanelsComp from "./Tabs/TabPanels";
import TabsListComp from "./Tabs/TabsList";

export enum TabEnum {
  Edit = "Edit",
  Share = "Share",
  Result = "Result",
  Settings = "Settings",
  Theme = "Theme",
}

export default function SurveyID(translations) {
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

  const { data: surveyVariables } = useGetSurveyVariables(surveyId, false);
  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title]);

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
  const [variables, setVariables] = useState([]);

  const { navOpened, setNavOpened } = useNavControlContext();

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

  useEffect(() => {
    setVariables(surveyVariables ?? []);
  }, [surveyVariables]);

  useEffect(() => {
    setNavOpened(false);
  }, []);

  if (isLoading || isSurveyLoading || !activeTab)
    return <RateupLoader h={"80dvh"} />;
  if (error || surveyError) {
    return <p>An error has occurred</p>;
  }
  return (
    <MantineProvider
      theme={survey?.type === SurveyType.WhatsApp ? whatsappTheme : undefined}
    >
      <SurveyContextProvider survey={survey}>
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
              variables,
              teams: teamOptions,
            }}
          >
            {user?.role !== UserRole.MEMBER && (
              <Portal target={"#tabs-container-entity-editor-tabs"}>
                <TabsListComp value={activeTab} onChange={setActiveTab} />
              </Portal>
            )}

            <TabPanelsComp
              value={activeTab}
              survey={survey}
              surveyId={surveyId}
              questions={questions}
              addQnTrigger={addQnTrigger}
              setSelectedLanguage={setSelectedLanguage}
              setFilterTags={setFilterTags}
              encryptionpassword={encryptionpassword}
              setEncryptionPassword={setEncryptionPassword}
              translations={translations}
              setActiveTab={setActiveTab}
            />
          </SurveyContext.Provider>
        </SelectedLanguageContext.Provider>
      </SurveyContextProvider>
    </MantineProvider>
  );
}
