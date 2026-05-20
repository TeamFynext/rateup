"use client";

import { lazy, Suspense } from "react";

import { useTranslation } from "react-i18next";

import { SubscriptionFeaturePathName, SurveyType } from "@/types/enums.ts";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { EditSurvey } from "../EditSurvey.tsx";
import Result from "../Result/Result.tsx";
import ResultComparison from "../Result/ResultComparison.tsx";
import SurveySettings from "../Settings/index.tsx";
import ShareSurvey from "../ShareSurvey/ShareSurvey.tsx";
import { TabEnum } from "../SurveyId.tsx";

const ResultsOverviewWebForm = lazy(
  () => import("../Result/ResultsOverviewWebForm.tsx"),
);

function TabPanelsComp({
  value,
  survey,
  surveyId,
  questions,
  addQnTrigger,
  setSelectedLanguage,
  setFilterTags,
  encryptionpassword,
  setEncryptionPassword,
  setActiveTab,
  setFunToRunBeforeSurveyIdPageHeaderTabsChange,
}) {
  const { t: translations } = useTranslation();
  const { data: subscription } = useSubscription();

  return (
    <Tabs value={value} className="h-full min-h-0">
      <TabsContent value={TabEnum.Edit}>
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
      </TabsContent>
      <TabsContent value={TabEnum.Result} className="min-h-0">
        <Tabs defaultValue="responses" className="relative h-full min-h-0">
          <TabsList className="mx-auto mb-2 flex">
            <TabsTrigger value="responses">
              {translations("Responses")}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              {translations("Analytics")}
            </TabsTrigger>
            <TabsTrigger value="team-analytics">
              {translations("Team Analytics")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="responses" className="min-h-0">
            <Result
              survey={survey}
              encryptionpassword={encryptionpassword}
              setEncryptionPassword={setEncryptionPassword}
              subscription={subscription}
            />
          </TabsContent>
          <TabsContent value="analytics" className="min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  Loading...
                </div>
              }
            >
              <ResultsOverviewWebForm
                surveyId={surveyId}
                aiResponseSummary={survey?.aiResponseSummary}
                survey={survey}
                flowId={null}
                version={1}
                flowQuestions={[]}
                questions={questions}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="team-analytics" className="min-h-0">
            <ResultComparison
              surveyId={surveyId}
              version={1}
              flowQuestions={[]}
              questions={questions}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>
      <TabsContent value={TabEnum.Share}>
        <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
      </TabsContent>
    </Tabs>
  );
}

export default TabPanelsComp;
