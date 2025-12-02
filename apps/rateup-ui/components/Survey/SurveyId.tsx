"use client";

import { useCallback, useEffect, useState } from "react";
import { Play } from "next/font/google";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  Center,
  Group,
  MantineProvider,
  MultiSelect,
  Portal,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  MessageSquare,
  MoreVertical,
  Pause,
  PlayIcon,
  Settings,
  Share2,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
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
import { whatsappTheme } from "../../config/mantineTheme";
import { useRouteParams } from "../../context/RouteParamsContext";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import SurveyContext from "../../context/SurveyContext";
import { useUser } from "../../context/UserContext";
import { SurveyType } from "../../types/enums";
import { UserRole } from "../../utils/enums";
import { getFromSessionStorage } from "../../utils/essential";
import ErrorComponent from "../404/ErrorComponent";
import RateupLoader from "../Loaders/RateupLoader";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SurveyQuestionTab } from "./SurveyTabs";
import TabPanelsComp from "./Tabs/TabPanels";
import TabsListComp from "./Tabs/TabsList";

export enum TabEnum {
  Overview = "Overview",
  Questions = "Questions",
  Edit = "Edit",
  Settings = "Settings",
  Share = "Share",
  // Theme = "Theme",
  Result = "Result",
}

export function SurveyIDs() {
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
          </SurveyContext.Provider>
        </SelectedLanguageContext.Provider>
      </SurveyContextProvider>
    </MantineProvider>
  );
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
  console.log(survey);
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

  const getStatusIcon = (status: boolean) => {
    if (status) {
      return <PlayIcon className="w-3 h-3" />;
    } else {
      return <Pause className="w-3 h-3" />;
    }
  };

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
          <div className="p-6">
            {/* Back Button & Title */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] ${!survey?.active && "bg-muted-foreground"}`}
                    >
                      {getStatusIcon(survey?.active)}
                      <span className="ml-1 capitalize">
                        {survey?.active
                          ? translations("Active")
                          : translations("Paused")}
                      </span>
                    </Badge>
                    <Badge className={`text-[10px]`}>
                      {survey.type.toUpperCase()}
                    </Badge>
                  </div>
                  <h1 className="text-3xl">{survey?.title}</h1>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    {survey?.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab(TabEnum.Share)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* {user?.role !== UserRole.MEMBER && (
            <Center mb={"xs"}>
              <TabsListComp
                value={activeTab}
                onChange={handleTabChange}
                tabs={Object.values(TabEnum)}
              />
            </Center>
          )} */}
          {/*  <SurveyIssueAlert questions={questions} survey={survey} /> */}
          {/* <div id="SurveyIssueAlert"> </div>
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
          )} */}

          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <Card className="border-slate-200 bg-white hover:shadow-md transition-all overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 rounded-full -mr-10 -mt-10 opacity-50" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                    <p className="text-3xl">{survey?.questions?.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total questions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-all overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-30" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-700" />
                      <p className="text-xs text-blue-700">Responses</p>
                    </div>
                    <p className="text-3xl text-blue-700">{survey.responses.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <p className="text-xs text-green-600">+12% this week</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
           
          </div> */}

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

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="border px-2 py-1 flex items-center gap-4">
              <TabsTrigger
                value={TabEnum.Overview}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <Activity className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value={TabEnum.Questions}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <FileText className="w-4 h-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger
                value={TabEnum.Edit}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <FileText className="w-4 h-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger
                value={TabEnum.Result}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <MessageSquare className="w-4 h-4" />
                Responses
              </TabsTrigger>
              {/* <TabsTrigger value="analytics" className="data-[state=active]:bg-[#2E5BFF] data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger> */}
              <TabsTrigger
                value={TabEnum.Settings}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* content */}
          <Tabs value={activeTab}>
            <TabsContent value={TabEnum.Questions} className="mt-0">
              <SurveyQuestionTab questions={survey?.questions} />
            </TabsContent>
          </Tabs>
        </SurveyContext.Provider>
      </SelectedLanguageContext.Provider>
    </SurveyContextProvider>
  );
}
