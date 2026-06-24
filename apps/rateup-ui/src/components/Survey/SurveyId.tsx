import { Center, Group, MultiSelect, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useParams, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { useGetSurveyVariables, useSurvey } from "@/backend/surveys/surveys.query";
import { useNavControlContext } from "@/context/NavControlContext.ts";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { SurveyContextProvider } from "@/context/SurveyObjContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";
import { getFromSessionStorage } from "@/utils/essential/index.ts";

import ErrorComponent from "../404/ErrorComponent.tsx";
import RateupLoader from "../Loaders/RateupLoader.tsx";
import TabPanelsComp from "./Tabs/TabPanels.tsx";
import TabsListComp from "./Tabs/TabsList.tsx";

import modalStyles from "@/styles/commonCssModules/modal.module.css";

export enum TabEnum {
  Edit = "Edit",
  Settings = "Settings",
  Share = "Share",
  // Theme = "Theme",
  Result = "Result",
}

export default function SurveyID() {
  const searchParams = useSearch({ strict: false });
  const params = useParams({
    strict: false,
  });
  const surveyId = params.surveyId as string;
  const tab = searchParams.tab;
  const { user } = useUser();

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }

  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
    refetch,
    isRefetching,
  } = useSurvey(surveyId);
  const {
    isLoading,
    error,
    data: questions,
    refetch: refetchQuestions,
    isRefetching: isRefetchingQ,
  } = useQuestions(surveyId);

  const { data: surveyVariables } = useGetSurveyVariables(surveyId, false);
  const { update } = useRouteParams();

  const multiSelectOptions = survey?.teams?.map((team) => {
    return { value: team?.mapId, label: team?.name };
  });
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title]);

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [defaultLanguage, setdefaultLanguage] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger] = useState(0);
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterTags] = useState([]);
  const [encryptionpassword, setEncryptionPassword] = useState("");
  const [variables, setVariables] = useState([]);
  const { t: translations } = useTranslation();

  const [
    funToRunBeforeSurveyIdPageHeaderTabsChange,
    setFunToRunBeforeSurveyIdPageHeaderTabsChange,
  ] = useState(null);

  const { setNavOpened } = useNavControlContext();

  const handleTabChange = useCallback(
    (value) => {
      const data = funToRunBeforeSurveyIdPageHeaderTabsChange?.();
      const { haveUnsavedChanges, feedbackElement, toastMessage } = data || {};
      if (haveUnsavedChanges && feedbackElement === "modal") {
        modals.openConfirmModal({
          title: translations("Discard unsaved changes?"),
          children: (
            <Text className={modalStyles["are-you-sure-text"]}>
              {translations("Are you sure, you want to discard unsaved changes?")}
            </Text>
          ),
          labels: {
            confirm: translations("Discard"),
            cancel: translations("Cancel"),
          },
          className: modalStyles["delete-confirmation-modal"],
          centered: true,
          classNames: {
            header: modalStyles["modal-header"],
            body: modalStyles["modal-body"],
            content: modalStyles["modal-content"],
          },
          onConfirm: () => {
            setActiveTab(value);
            setFunToRunBeforeSurveyIdPageHeaderTabsChange(null);
          },
        });
        return;
      } else if (haveUnsavedChanges && feedbackElement === "toast") {
        toast.error(toastMessage, {
          id: "surveyid-unsaved-changes-toast",
        });
        return;
      }
      setActiveTab(value);
      setFunToRunBeforeSurveyIdPageHeaderTabsChange(null);
    },
    [funToRunBeforeSurveyIdPageHeaderTabsChange],
  );

  useEffect(() => {
    if (user?.role === UserRole.MEMBER) {
      setActiveTab(TabEnum.Result);
    }
  }, [survey]);

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    if (survey) {
      if (activeTab !== TabEnum.Result) {
        setSelectedLanguage(selectedLanguage ? selectedLanguage : survey?.languages?.[0]);
      } else {
        setSelectedLanguage("");
      }
      setdefaultLanguage(survey?.languages?.[0]);
      const options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey, activeTab]);

  useEffect(() => {
    if (teamOptions) setSelectedTeamId(teamOptions[0]?.value);
  }, [teamOptions]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId);
      setSelectedTeamName(survey?.teams?.find((team) => team.id === selectedTeamId)?.name);
    }
  }, [selectedTeamId]);

  const savedEncryptionPassword = getFromSessionStorage(`${survey?.id}_ete_passkey`);

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

  if (isLoading || isSurveyLoading || !activeTab) return <RateupLoader h={"80dvh"} />;

  if (error || surveyError) {
    return (
      <ErrorComponent
        refetch={surveyError ? refetch : refetchQuestions}
        isRefetching={isRefetching || isRefetchingQ}
      />
    );
  }

  return (
    <SurveyContextProvider survey={survey}>
      <SelectedLanguageContext.Provider value={{ selectedLanguage, defaultLanguage }}>
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
          <div className="flex flex-col h-full">
            {user?.role !== UserRole.MEMBER && (
              <Center mb={"xs"}>
                <TabsListComp
                  value={activeTab}
                  onChange={handleTabChange}
                  tabs={Object.values(TabEnum)}
                />
              </Center>
            )}
            {/*  <SurveyIssueAlert questions={questions} survey={survey} /> */}
            <div id="SurveyIssueAlert"> </div>
            {activeTab === TabEnum.Result && (
              <Group pos={"absolute"} right={30}>
                <MultiSelect
                  radius={"10px"}
                  searchable
                  clearable
                  data={multiSelectOptions}
                  value={filterTeams}
                  onChange={setFilterTeams}
                  placeholder={filterTeams.length > 0 ? "" : translations("All Teams")}
                />
              </Group>
            )}

            <TabPanelsComp
              value={activeTab}
              survey={survey}
              surveyId={surveyId}
              questions={questions}
              addQnTrigger={addQnTrigger}
              setSelectedLanguage={setSelectedLanguage}
              encryptionpassword={encryptionpassword}
              setEncryptionPassword={setEncryptionPassword}
              setActiveTab={setActiveTab}
              setFunToRunBeforeSurveyIdPageHeaderTabsChange={
                setFunToRunBeforeSurveyIdPageHeaderTabsChange
              }
            />
          </div>
        </SurveyContext.Provider>
      </SelectedLanguageContext.Provider>
    </SurveyContextProvider>
  );
}
