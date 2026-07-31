import { useParams, useSearch } from "@tanstack/react-router";
import { BarChart3, FileText, MessageSquare, Palette, Settings, Share2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { useGetSurveyVariables, useSurvey } from "@/backend/surveys/surveys.query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
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
import SurveyPageHeader, { type SurveyHeaderTab } from "./SurveyPageHeader.tsx";
import type { UnsavedChangesCheck } from "./Tabs/TabPanels.tsx";
import TabPanelsComp from "./Tabs/TabPanels.tsx";

export enum TabEnum {
  Edit = "Edit",
  Theme = "Theme",
  Settings = "Settings",
  Share = "Share",
  Responses = "Responses",
  Analytics = "Analytics",
  TeamAnalytics = "Team Analytics",
}

const RESULT_TABS: TabEnum[] = [TabEnum.Responses, TabEnum.Analytics, TabEnum.TeamAnalytics];

const HEADER_TABS: SurveyHeaderTab<TabEnum>[] = [
  { value: TabEnum.Edit, label: "Questions", icon: FileText },
  { value: TabEnum.Theme, label: "Edit Theme", icon: Palette },
  { value: TabEnum.Settings, label: "Settings", icon: Settings },
  { value: TabEnum.Share, label: "Share", icon: Share2 },
  { value: TabEnum.Responses, label: "Responses", icon: MessageSquare },
  { value: TabEnum.Analytics, label: "Analytics", icon: BarChart3 },
  { value: TabEnum.TeamAnalytics, label: "Team Analytics", icon: Users },
];

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

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [defaultLanguage, setdefaultLanguage] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState("");
  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Edit);
  const [addQnTrigger] = useState(0);
  const [teamOptions, setTeamOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [filterTeams, setFilterTeams] = useState<string[]>([]);
  const [filterTags] = useState<string[]>([]);
  const [encryptionpassword, setEncryptionPassword] = useState("");
  const [variables, setVariables] = useState<SurveyVariable[]>([]);
  const { t: translations } = useTranslation();

  /** Set by the active tab so it can veto a tab change with unsaved edits. */
  const [
    funToRunBeforeSurveyIdPageHeaderTabsChange,
    setFunToRunBeforeSurveyIdPageHeaderTabsChange,
  ] = useState<UnsavedChangesCheck | null>(null);

  const [discardTabChangeDialog, setDiscardTabChangeDialog] = useState<{
    open: boolean;
    value: TabEnum | null;
  }>({ open: false, value: null });

  const { setNavOpened } = useNavControlContext();

  const handleTabChange = useCallback(
    (value: TabEnum) => {
      const data = funToRunBeforeSurveyIdPageHeaderTabsChange?.();
      const { haveUnsavedChanges, feedbackElement, toastMessage } = data || {};
      if (haveUnsavedChanges && feedbackElement === "modal") {
        setDiscardTabChangeDialog({ open: true, value });
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
      setActiveTab(TabEnum.Responses);
    }
  }, [survey]);

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    if (survey) {
      if (!activeTab || !RESULT_TABS.includes(activeTab)) {
        setSelectedLanguage(selectedLanguage ? selectedLanguage : (survey?.languages?.[0] ?? null));
      } else {
        setSelectedLanguage("");
      }
      setdefaultLanguage(survey?.languages?.[0] ?? null);
      const options = survey?.teams?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));
      setTeamOptions(options);
    }
  }, [survey, activeTab]);

  useEffect(() => {
    if (teamOptions) setSelectedTeamId(teamOptions[0]?.value ?? "");
  }, [teamOptions]);

  useEffect(() => {
    if (selectedTeamId) {
      setSurveyTeamMapId(survey?.teams?.find((team) => team.id === selectedTeamId)?.mapId ?? "");
      setSelectedTeamName(survey?.teams?.find((team) => team.id === selectedTeamId)?.name ?? "");
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

  if (isLoading || isSurveyLoading || !activeTab || !survey || !questions)
    return <RateupLoader className="h-[80dvh]" />;

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
        value={{ selectedLanguage: selectedLanguage ?? "", defaultLanguage: defaultLanguage ?? "" }}
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
              <SurveyPageHeader
                title={survey?.title ?? ""}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                tabs={HEADER_TABS}
              />
            )}
            {/*  <SurveyIssueAlert questions={questions} survey={survey} /> */}
            <div id="SurveyIssueAlert"> </div>
            {activeTab && RESULT_TABS.includes(activeTab) && (
              <div className="absolute right-[30px]">
                <MultiSelect
                  className="w-56 rounded-[10px]"
                  options={multiSelectOptions ?? []}
                  value={filterTeams}
                  onValueChange={setFilterTeams}
                  placeholder={filterTeams.length > 0 ? "" : translations("All Teams")}
                />
              </div>
            )}

            <AlertDialog
              open={discardTabChangeDialog.open}
              onOpenChange={(open) => setDiscardTabChangeDialog((prev) => ({ ...prev, open }))}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{translations("Discard unsaved changes?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {translations("Are you sure, you want to discard unsaved changes?")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{translations("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setActiveTab(discardTabChangeDialog.value);
                      setFunToRunBeforeSurveyIdPageHeaderTabsChange(null);
                      setDiscardTabChangeDialog({ open: false, value: null });
                    }}
                  >
                    {translations("Discard")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
