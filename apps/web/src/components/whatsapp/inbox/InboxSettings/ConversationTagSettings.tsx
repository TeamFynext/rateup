import { IconHash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  useConversationTags,
  useCreateConversationTag,
  useDeleteConversationTag,
  useUpdateConversationTag,
} from "@/backend/whatsapp/inbox/conversationTag/conversationTag.query.ts";

import TaxonomySettings, { type TaxonomyItem } from "./TaxonomySettings.tsx";

/**
 * Conversation tags — the *ticket-grained* taxonomy. A tag describes one
 * conversation, so the same customer's other tickets keep their own tags.
 * Contact labels are the customer-grained counterpart (`ContactLabelSettings`).
 */
export default function ConversationTagSettings() {
  const { t } = useTranslation();
  const { data: tags = [], isPending } = useConversationTags();
  const createTag = useCreateConversationTag();
  const updateTag = useUpdateConversationTag();
  const deleteTag = useDeleteConversationTag();

  const items: TaxonomyItem[] = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    usageCount: tag.conversationCount ?? 0,
  }));

  return (
    <TaxonomySettings
      title={t("Conversation tags")}
      description={t(
        "A tag describes a single conversation. Contact labels stick to the customer instead.",
      )}
      addLabel={t("Create tag")}
      usageNoun={t("conversations")}
      emptyMessage={t("No conversation tags yet.")}
      items={items}
      isLoading={isPending}
      isSaving={createTag.isPending || updateTag.isPending}
      onCreate={(values) => createTag.mutate(values)}
      onUpdate={(tagId, data) => updateTag.mutate({ tagId, data })}
      onDelete={(tagId) => deleteTag.mutate(tagId)}
      renderMark={(color) => <IconHash className="size-4 shrink-0" style={{ color }} />}
    />
  );
}
