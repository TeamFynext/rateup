import { IconHistory } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RuleAutomationsSection } from "@/components/dashboard/meta-channels/RuleAutomationsSection.tsx";

export function StoriesTab({ ibaId }: Readonly<{ ibaId: string }>) {
  const { t } = useTranslation();
  return (
    <RuleAutomationsSection
      platform="INSTAGRAM"
      triggerEvent="INSTAGRAM_STORY_MENTION"
      channelId={ibaId}
      icon={IconHistory}
      title={t("Story mention automations")}
      description={t("Triggered when someone mentions your account in their Instagram story.")}
      emptyTitle={t("No story mention automations yet")}
      emptyDescription={t(
        "Create a rule to reply when someone mentions your account in their story.",
      )}
    />
  );
}
