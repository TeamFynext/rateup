import { useTranslation } from "react-i18next";

import {
  useContactLabels,
  useCreateContactLabelMutation,
  useDeleteContactLabelMutation,
  useUpdateContactLabelMutation,
} from "@/backend/campaign/contacts/contacts.query";

import TaxonomySettings, { type TaxonomyItem } from "./TaxonomySettings.tsx";

/**
 * Contact labels — the *customer-grained* taxonomy. A label stays on the contact,
 * so it shows on every ticket that contact ever opens. Conversation tags are the
 * per-ticket counterpart (`ConversationTagSettings`).
 */
export default function ContactLabelSettings() {
  const { t } = useTranslation();
  const { data: labels = [], isPending } = useContactLabels();
  const createLabel = useCreateContactLabelMutation();
  const updateLabel = useUpdateContactLabelMutation();
  const deleteLabel = useDeleteContactLabelMutation();

  const items: TaxonomyItem[] = labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    usageCount: label._count?.contactLabels ?? 0,
  }));

  return (
    <TaxonomySettings
      title={t("Contact labels")}
      description={t(
        "A label sticks to the customer — it stays visible on every ticket they open.",
      )}
      addLabel={t("Create label")}
      usageNoun={t("contacts")}
      emptyMessage={t("No contact labels yet.")}
      items={items}
      isLoading={isPending}
      isSaving={createLabel.isPending || updateLabel.isPending}
      onCreate={(values) => createLabel.mutate(values)}
      onUpdate={(labelId, data) => updateLabel.mutate({ labelId, data })}
      onDelete={(labelId) => deleteLabel.mutate(labelId)}
      renderMark={(color) => (
        <span className="size-3.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
    />
  );
}
