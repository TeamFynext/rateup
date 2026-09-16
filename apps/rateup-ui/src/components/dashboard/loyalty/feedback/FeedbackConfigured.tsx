import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { FeedbackState } from "@/backend/loyalty/feedback.api.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import type { FeedbackSearch } from "./feedback.search.ts";
import { FeedbackResultsTab } from "./FeedbackResultsTab.tsx";
import { FeedbackSettingsForm } from "./FeedbackSettingsForm.tsx";
import { FeedbackStatusCard } from "./FeedbackStatusCard.tsx";
import { isFeedbackTab, type FeedbackTab } from "./feedbackTabs.ts";

export function FeedbackConfigured({
  state,
  search,
}: Readonly<{ state: FeedbackState; search: FeedbackSearch }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const active: FeedbackTab = search.tab ?? "settings";

  const goTo = (tab: FeedbackTab) =>
    navigate({ to: LOYALTY_PATHS.feedback, search: { ...search, tab } });

  return (
    <div className="flex flex-col gap-6">
      <FeedbackStatusCard state={state} onViewResults={() => goTo("results")} />

      <Tabs
        value={active}
        onValueChange={(value) => {
          if (isFeedbackTab(value)) goTo(value);
        }}
      >
        <TabsList>
          <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>
          <TabsTrigger value="results">{t("Results")}</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="pt-4">
          <FeedbackSettingsForm state={state} />
        </TabsContent>
        <TabsContent value="results" className="pt-4">
          <FeedbackResultsTab state={state} search={search} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
