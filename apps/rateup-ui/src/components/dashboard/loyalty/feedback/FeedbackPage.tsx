import { IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useLoyaltyFeedback } from "@/backend/loyalty/feedback.query.ts";
import { PageHeading } from "@/components/common/page-heading.tsx";

import type { FeedbackSearch } from "./feedback.search.ts";
import { FeedbackConfigured } from "./FeedbackConfigured.tsx";
import { FeedbackSetup } from "./FeedbackSetup.tsx";

/**
 * Loyalty › Feedback. Before a flow exists the page is the draft picker; after, it is the
 * flow's status, its settings and its results.
 */
export function FeedbackPage({ search }: Readonly<{ search: FeedbackSearch }>) {
  const { t } = useTranslation();
  const { data: state, isPending } = useLoyaltyFeedback();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={t("Feedback")}
        description={t(
          "A short WhatsApp survey after points are earned. Happy customers are asked for a Google review, and can be thanked with a reward.",
        )}
      />
      {isPending || !state ? (
        <div className="flex h-64 items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : state.flow && state.setting ? (
        <FeedbackConfigured state={state} search={search} />
      ) : (
        <FeedbackSetup />
      )}
    </div>
  );
}
