import { useTranslation } from "react-i18next";

import {
  useBulkDeleteLeadsMutation,
  useDeleteLeadMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

/**
 * Asks first, then deletes. Admin-only, as the API is: `canDelete` is false for everyone
 * else, who close a lead as lost instead, so the history and the stats keep it.
 */
export function useDeleteLeads() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const single = useDeleteLeadMutation();
  const bulk = useBulkDeleteLeadsMutation();

  const deleteLead = async (lead: { id: string; name: string }, onDeleted?: () => void) => {
    const ok = await confirm({
      title: t("Delete {name}?", { name: lead.name }),
      description: t(
        "Its notes, tasks and history go with it, and it cannot be undone. If the lead was real but did not work out, mark it as lost instead.",
      ),
      confirmText: t("Delete lead"),
    });
    if (ok) single.mutate(lead.id, { onSuccess: onDeleted });
  };

  /** Resolves true once the user has confirmed, so the caller can clear its selection. */
  const deleteLeads = async (leadIds: string[]) => {
    const ok = await confirm({
      title: t("Delete {total, plural, one {# lead} other {# leads}}?", { total: leadIds.length }),
      description: t(
        "Their notes, tasks and history go with them, and it cannot be undone. Leads that were real but did not work out are better marked as lost.",
      ),
      confirmText: t("Delete"),
    });
    if (ok) bulk.mutate(leadIds);
    return ok;
  };

  return { canDelete: can("pipelines.admin"), deleteLead, deleteLeads };
}
