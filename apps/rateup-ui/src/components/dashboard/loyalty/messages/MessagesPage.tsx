import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import { AutomaticMessagesTab } from "./AutomaticMessagesTab.tsx";
import { isMessagesTab, type MessagesTab } from "./messagesTabs.ts";
import { RepliesTab } from "./RepliesTab.tsx";
import { TemplateLibraryTab } from "./TemplateLibraryTab.tsx";

/**
 * Everything the programme says on WhatsApp, in one place: what sends automatically, how
 * it replies to what customers text, and the Meta templates behind both.
 */
export function MessagesPage({ tab }: Readonly<{ tab?: MessagesTab }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: state } = useLoyaltyOnboardingState();
  const active: MessagesTab = tab ?? "automatic";
  const templatesPending = state?.counts.templatesPending ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title={t("Messages")}
        description={t(
          "Everything your program says on WhatsApp — what sends automatically, how it replies, and the templates behind them.",
        )}
      />

      <Tabs
        value={active}
        onValueChange={(value) => {
          if (isMessagesTab(value)) {
            navigate({ to: LOYALTY_PATHS.messages, search: { tab: value } });
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="automatic">{t("Automatic")}</TabsTrigger>
          <TabsTrigger value="replies">{t("Replies")}</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            {t("Templates")}
            {templatesPending > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-50 px-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
              >
                {templatesPending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="automatic" className="pt-4">
          <AutomaticMessagesTab />
        </TabsContent>
        <TabsContent value="replies" className="pt-4">
          <RepliesTab />
        </TabsContent>
        <TabsContent value="templates" className="pt-4">
          <TemplateLibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
