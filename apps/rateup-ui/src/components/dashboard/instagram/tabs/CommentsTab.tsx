import { IconMessageDots } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RuleAutomationsSection } from "@/components/dashboard/meta-channels/RuleAutomationsSection.tsx";

import { CommentModerationSection } from "./CommentModerationSection.tsx";

/**
 * `ibaId` is the account picked in the page header; rules for other accounts stay hidden.
 * The rules come first, then the post-by-post comment moderation.
 */
export function CommentsTab({ ibaId }: Readonly<{ ibaId: string }>) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <RuleAutomationsSection
        platform="INSTAGRAM"
        triggerEvent="INSTAGRAM_COMMENT"
        channelId={ibaId}
        icon={IconMessageDots}
        title={t("Comment automations")}
        description={t("Automatically send private replies when someone comments on your posts.")}
        emptyTitle={t("No comment automations yet")}
        emptyDescription={t(
          "Create a rule to send a private reply when someone comments on your posts.",
        )}
      />
      <CommentModerationSection ibaId={ibaId} />
    </div>
  );
}
