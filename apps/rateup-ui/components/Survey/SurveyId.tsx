"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { Center, Group, MultiSelect, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useTranslations } from "next-intl";
import modalStyles from "styles/commonCssModules/modal.module.css";

import { useNavControlContext } from "@/context/NavControlContext";
import { SurveyContextProvider } from "@/context/SurveyObjContext";
import { showErrorToast } from "@/utils/notifications";

import { useQuestions } from "../../backend/surveys/questions/questions.query";
import {
  useGetSurveyVariables,
  useSurvey,
} from "../../backend/surveys/surveys.query";
import { useRouteParams } from "../../context/RouteParamsContext";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import SurveyContext from "../../context/SurveyContext";
import { useUser } from "../../context/UserContext";
import { UserRole } from "../../utils/enums";
import { getFromSessionStorage } from "../../utils/essential";
import ErrorComponent from "../404/ErrorComponent";
import RateupLoader from "../Loaders/RateupLoader";
import TabPanelsComp from "./Tabs/TabPanels";
import TabsListComp from "./Tabs/TabsList";

export enum TabEnum {
  Edit = "Edit",
  Settings = "Settings",
  Share = "Share",
  // Theme = "Theme",
  Result = "Result",
}

export default function SurveyID() {
  const searchParams = useSearchParams();
  const params = useParams();
  const surveyId = params.surveyId as string;
  const tab = searchParams.get("tab");
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
  const [addQnTrigger, setaddQnTrigger] = useState(0);
  const [teamOptions, setTeamOptions] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [encryptionpassword, setEncryptionPassword] = useState("");
  const [variables, setVariables] = useState([]);
  const translations = useTranslations();

  const [
    funToRunBeforeSurveyIdPageHeaderTabsChange,
    setFunToRunBeforeSurveyIdPageHeaderTabsChange,
  ] = useState(null);

  const { navOpened, setNavOpened } = useNavControlContext();

  const handleTabChange = useCallback(
    (value) => {
      const data = funToRunBeforeSurveyIdPageHeaderTabsChange?.();
      const { haveUnsavedChanges, feedbackElement, toastMessage } = data || {};
      if (haveUnsavedChanges && feedbackElement === "modal") {
        modals.openConfirmModal({
          title: translations("Discard unsaved changes?"),
          children: (
            <Text className={modalStyles["are-you-sure-text"]}>
              {translations(
                "Are you sure, you want to discard unsaved changes?",
              )}
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
        showErrorToast(toastMessage, "surveyid-unsaved-changes-toast");
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
    return (
      <ErrorComponent
        refetch={surveyError ? refetch : refetchQuestions}
        isRefetching={isRefetching || isRefetchingQ}
      />
    );
  }

  return (
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
                  placeholder={
                    filterTeams.length > 0 ? "" : translations("All Teams")
                  }
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
              setFilterTags={setFilterTags}
              encryptionpassword={encryptionpassword}
              setEncryptionPassword={setEncryptionPassword}
              translations={translations}
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
