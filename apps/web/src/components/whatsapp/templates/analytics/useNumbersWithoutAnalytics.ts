import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { getTemplateInsightsStatus } from "@/backend/whatsapp/templateAnalytics.api";
import { templateAnalyticsKeys } from "@/backend/whatsapp/templateAnalytics.query";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";

/**
 * The WhatsApp numbers on screen whose account has not opted in to Meta's
 * template analytics, so the list can offer to turn them on. Only numbers with
 * a template Meta has seen are asked about.
 */
export function useNumbersWithoutAnalytics(templates: readonly WaTemplateListEntry[]) {
  const phoneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const template of templates) {
      const phoneId = template.whatsappSettingsPhoneId;
      if (phoneId && template.data?.id && template.data.status !== "DRAFT") ids.add(phoneId);
    }
    return [...ids].sort();
  }, [templates]);

  const results = useQueries({
    queries: phoneIds.map((phoneId) => ({
      queryKey: templateAnalyticsKeys.status(phoneId),
      queryFn: () => getTemplateInsightsStatus(phoneId),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  return phoneIds.filter((_, index) => results[index]?.data?.status === "disabled");
}
