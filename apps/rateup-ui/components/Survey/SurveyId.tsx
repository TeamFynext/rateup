"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { modals } from "@mantine/modals";
import { ClipboardList, Edit2, FileText, Settings, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import modalStyles from "styles/commonCssModules/modal.module.css";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useNavControlContext } from "@/context/NavControlContext";
import { SurveyContextProvider } from "@/context/SurveyObjContext";
import { showErrorToast } from "@/utils/notifications";
import { hasFeature } from "@/utils/subscription/subscription";

import { useQuestions } from "../../backend/surveys/questions/questions.query";
import {
  useGetSurveyVariables,
  useSurvey,
} from "../../backend/surveys/surveys.query";
import { useRouteParams } from "../../context/RouteParamsContext";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import SurveyContext from "../../context/SurveyContext";
import { useUser } from "../../context/UserContext";
import { SubscriptionFeaturePathName, SurveyType } from "../../types/enums";
import { UserRole } from "../../utils/enums";
import { getFromSessionStorage } from "../../utils/essential";
import ErrorComponent from "../404/ErrorComponent";
import RateupLoader from "../Loaders/RateupLoader";
import { Button } from "../ui/button";
import { MultiSelect } from "../ui/multi-select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { EditSurvey } from "./EditSurvey";
import Result from "./Result/Result";
import SurveySettings from "./Settings";
import ShareSurvey from "./ShareSurvey/ShareSurvey";

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
  const [activeTab, setActiveTab] = useState<TabEnum | null | string>(
    tab || TabEnum.Edit,
  );
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
  const { data: subscription } = useSubscription();

  const handleTabChange = useCallback(
    (value) => {
      const data = funToRunBeforeSurveyIdPageHeaderTabsChange?.();
      const { haveUnsavedChanges, feedbackElement, toastMessage } = data || {};
      if (haveUnsavedChanges && feedbackElement === "modal") {
        modals.openConfirmModal({
          title: translations("Discard unsaved changes?"),
          children: (
            <p className={modalStyles["are-you-sure-text"]}>
              {translations(
                "Are you sure, you want to discard unsaved changes?",
              )}
            </p>
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
          <div className="px-6 py-2">
            {/* Back Button & Title */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex gap-1">
                  <h1 className="text-base sm:text-2xl">{survey?.title}</h1>
                </div>
              </div>

              <div className="sm:flex sm:items-center sm:gap-2 hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab(TabEnum.Share)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {translations("Share")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab(TabEnum.Edit)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {translations("Edit")}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {user?.role !== UserRole.MEMBER && (
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="border px-2 py-1 flex items-center gap-1 sm:gap-4">
                  <TabsTrigger
                    value={TabEnum.Edit}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {translations("Questions")}
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value={TabEnum.Share}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {translations("Share")}
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value={TabEnum.Settings}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {translations("Settings")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value={TabEnum.Result}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {translations("Result")}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* content */}
            <Tabs value={activeTab}>
              <div className="max-h-[90vh] overflow-auto w-full">
                {activeTab === TabEnum.Edit && (
                  <EditSurvey
                    questions={questions}
                    addQnTrigger={addQnTrigger}
                    surveyLanguages={survey?.languages}
                    setSelectedLanguage={setSelectedLanguage}
                    subscription={subscription}
                    setFunToRunBeforeSurveyIdPageHeaderTabsChange={
                      setFunToRunBeforeSurveyIdPageHeaderTabsChange
                    }
                  />
                )}
                {activeTab === TabEnum.Result && (
                  <div className="relative">
                    <div className="max-w-sm min-w-sm mb-2 sm:absolute sm:right-0 sm:top-0 sm:mb-0">
                      <MultiSelect
                        options={multiSelectOptions}
                        value={filterTeams}
                        onValueChange={setFilterTeams}
                        placeholder={
                          filterTeams.length > 0
                            ? ""
                            : translations("All Teams")
                        }
                      />
                    </div>
                    <Result
                      survey={survey}
                      encryptionpassword={encryptionpassword}
                      setEncryptionPassword={setEncryptionPassword}
                      subscription={subscription}
                      translations={translations}
                    />
                  </div>
                )}

                {activeTab === TabEnum.Share && (
                  <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
                )}

                {activeTab === TabEnum.Settings && (
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
                            hasFeature(
                              subscription,
                              SubscriptionFeaturePathName.Webhook,
                            ) && "webhook",
                          ]
                    }
                  />
                )}
              </div>
            </Tabs>
          </div>
        </SurveyContext.Provider>
      </SelectedLanguageContext.Provider>
    </SurveyContextProvider>
  );
}
