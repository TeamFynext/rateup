"use client";

import { Tabs, TabsPanel } from "@mantine/core";

import { SubscriptionFeaturePathName, SurveyType } from "@/types/enums";
import { useSubscription } from "@/backend/subscription/subscription.query";
import {
  Tabs as ShadTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { hasFeature } from "@/utils/subscription/subscription";

import { EditSurvey } from "../EditSurvey";
import Result from "../Result/Result";
import ResultComparison from "../Result/ResultComparison";
import ResultsOverviewWebForm from "../Result/ResultsOverviewWebForm";
import SurveySettings from "../Settings";
import ShareSurvey from "../ShareSurvey/ShareSurvey";
import { TabEnum } from "../SurveyId";
import styles from "./Tabs.module.css";

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
  translations,
  setActiveTab,
  setFunToRunBeforeSurveyIdPageHeaderTabsChange,
}) {
  const { data: subscription } = useSubscription();

  return (
    <Tabs
      classNames={{
        root: styles["tab-panel-root"],
        panel: styles["tab-panel"],
      }}
      value={value}
      keepMounted={false}
    >
      <TabsPanel
        value={TabEnum.Edit}
        style={{ background: "white", width: "100%", height: "100%" }}
      >
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
      </TabsPanel>
      <TabsPanel value={TabEnum.Settings}>
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
      </TabsPanel>
      <TabsPanel value={TabEnum.Result}>
        <ShadTabs defaultValue="responses">
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
          <TabsContent value="responses">
            <Result
              survey={survey}
              encryptionpassword={encryptionpassword}
              setEncryptionPassword={setEncryptionPassword}
              subscription={subscription}
              translations={translations}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <ResultsOverviewWebForm
              surveyId={surveyId}
              aiResponseSummary={(survey as any)?.aiResponseSummary}
              survey={survey}
              flowId={null}
              version={1}
              flowQuestions={[]}
              questions={questions}
            />
          </TabsContent>
          <TabsContent value="team-analytics">
            <ResultComparison
              surveyId={surveyId}
              version={1}
              flowQuestions={[]}
              questions={questions}
            />
          </TabsContent>
        </ShadTabs>
      </TabsPanel>
      <TabsPanel value={TabEnum.Share}>
        <ShareSurvey survey={survey} setActiveTab={setActiveTab} />
      </TabsPanel>
    </Tabs>
  );
}

export default TabPanelsComp;
