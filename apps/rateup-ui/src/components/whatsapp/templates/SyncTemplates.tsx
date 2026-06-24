import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useSyncTemplatesMutation } from "@/backend/whatsapp/whatsapp.query";
import { Button } from "@/components/ui/button.tsx";

import classes from "./template.module.css";

export function SyncTemplatesButton({
  disabled = false,
  whatsappSettingsPhoneIds,
}: Readonly<{
  disabled?: boolean;
  whatsappSettingsPhoneIds?: string[];
}>) {
  const syncMutation = useSyncTemplatesMutation();
  const { t: translations } = useTranslation();
  function handleSyncClick() {
    syncMutation.mutate(
      whatsappSettingsPhoneIds?.length ? { whatsappSettingsPhoneIds } : undefined,
    );
  }

  return (
    <Button variant="outline" onClick={handleSyncClick} disabled={disabled}>
      <IconRefresh className={syncMutation.isPending ? classes.rotateInfinitely : ""} />
      {translations("Sync")}
    </Button>
  );
}
