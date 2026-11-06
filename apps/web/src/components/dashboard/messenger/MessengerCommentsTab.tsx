import { IconMessageDots } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RuleAutomationsSection } from "@/components/dashboard/meta-channels/RuleAutomationsSection.tsx";

/** "Facebook Page Comment" rules for one Page; mirrors Instagram's Comments tab. */
export function MessengerCommentsTab({ pageId }: Readonly<{ pageId: string }>) {
  const { t } = useTranslation();
  return (
    <RuleAutomationsSection
      platform="FACEBOOK"
      triggerEvent="FACEBOOK_COMMENT"
      channelId={pageId}
      icon={IconMessageDots}
      title={t("Comment automations")}
      description={t("Reply privately in Messenger when someone comments on your Page's posts.")}
      emptyTitle={t("No comment automations yet")}
      emptyDescription={t(
        "Create a rule to reply in Messenger when someone comments on your Page's posts.",
      )}
    />
  );
}
