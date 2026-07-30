import { lazy, Suspense } from "react";
import type { Dispatch, SetStateAction } from "react";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { Tabs, TabsContent } from "@/components/ui/tabs.tsx";
import { SubscriptionFeaturePathName, SurveyType } from "@/types/enums.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { EditSurvey } from "../EditSurvey.tsx";
import { EditTheme } from "../EditTheme.tsx";
import Result from "../Result/Result.tsx";
import ResultComparison from "../Result/ResultComparison.tsx";
import SurveySettings from "../Settings/index.tsx";
import ShareSurvey from "../ShareSurvey/ShareSurvey.tsx";
import { TabEnum } from "../SurveyId.tsx";

const ResultsOverviewWebForm = lazy(() => import("../Result/ResultsOverviewWebForm.tsx"));

/** What the active tab reports when the user tries to leave it. */
export type UnsavedChangesCheck = () => {
  haveUnsavedChanges?: boolean;
  feedbackElement?: string;
  toastMessage?: string;
};

function TabPanelsComp({
  value,
  survey,
  surveyId,
  questions,
  addQnTrigger,
  setSelectedLanguage,
  encryptionpassword,
  setEncryptionPassword,
  setActiveTab,
  setFunToRunBeforeSurveyIdPageHeaderTabsChange,
}: {
  value: string;
  survey: Survey;
  surveyId: string;
  questions: Question[];
  addQnTrigger: number;
  setSelectedLanguage: Dispatch<SetStateAction<string | null>>;
  encryptionpassword: string;
  setEncryptionPassword: (password: string) => void;
  setActiveTab: (tab: TabEnum) => void;
  setFunToRunBeforeSurveyIdPageHeaderTabsChange: Dispatch<
    SetStateAction<UnsavedChangesCheck | null>
  >;
}) {
  const { data: subscription } = useSubscription();

  return (
    <Tabs value={value} className="h-full min-h-0">
      <TabsContent value={TabEnum.Edit} className="h-full min-h-0">
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
      </TabsContent>
      <TabsContent value={TabEnum.Theme} className="h-full min-h-0">
        <EditTheme
          survey={survey}
          questions={questions}
          onClose={() => setActiveTab(TabEnum.Edit)}
          setFunToRunBeforeSurveyIdPageHeaderTabsChange={
            setFunToRunBeforeSurveyIdPageHeaderTabsChange
          }
        />
      </TabsContent>
      <TabsContent value={TabEnum.Settings}>
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
                  hasFeature(subscription, SubscriptionFeaturePathName.Encryption) &&
                    "endtoendencryption",
                  "redirect",
                  "uniqueDeviceResponse",
                  "tickets",
                  hasFeature(subscription, SubscriptionFeaturePathName.EmailNotification) &&
                    "enableNotificationEmail",
                  hasFeature(subscription, SubscriptionFeaturePathName.Webhook) && "webhook",
                ].filter((m): m is string => typeof m === "string")
          }
        />
      </TabsContent>
      <TabsContent value={TabEnum.Responses} className="min-h-0">
        <Result
          survey={survey}
          encryptionpassword={encryptionpassword}
          setEncryptionPassword={setEncryptionPassword}
        />
      </TabsContent>
      <TabsContent value={TabEnum.Analytics} className="min-h-0">
        <Suspense
          fallback={<div className="flex items-center justify-center h-64">Loading...</div>}
        >
          <ResultsOverviewWebForm
            surveyId={surveyId}
            aiResponseSummary={survey?.aiResponseSummary ?? []}
            flowId={undefined}
            version={1}
            flowQuestions={[]}
            questions={questions}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value={TabEnum.TeamAnalytics} className="min-h-0">
        <ResultComparison
          surveyId={surveyId}
          version={1}
          flowQuestions={[]}
          questions={questions}
        />
      </TabsContent>
      <TabsContent value={TabEnum.Share}>
        <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
      </TabsContent>
    </Tabs>
  );
}

export default TabPanelsComp;
