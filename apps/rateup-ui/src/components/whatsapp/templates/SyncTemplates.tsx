import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useSyncTemplatesMutation } from "@/backend/whatsapp/whatsapp.query";
import { Button } from "@/components/ui/button.tsx";

export function SyncTemplatesButton({
  disabled = false,
  whatsappSettingsPhoneIds,
  onSynced,
  label,
}: Readonly<{
  disabled?: boolean;
  whatsappSettingsPhoneIds?: string[];
  /** After the templates cache is swept — for callers with a dependent count to refresh. */
  onSynced?: () => void;
  label?: string;
}>) {
  const syncMutation = useSyncTemplatesMutation(onSynced);
  const { t: translations } = useTranslation();
  function handleSyncClick() {
    syncMutation.mutate(
      whatsappSettingsPhoneIds?.length ? { whatsappSettingsPhoneIds } : undefined,
    );
  }

  return (
    <Button variant="outline" onClick={handleSyncClick} disabled={disabled}>
      <IconRefresh className={syncMutation.isPending ? "animate-spin" : ""} />
      {label ?? translations("Sync")}
    </Button>
  );
}
