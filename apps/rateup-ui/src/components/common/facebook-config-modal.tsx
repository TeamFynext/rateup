import { useTranslation } from "react-i18next";

import { MetaPagePickerDialog, type WaSetting } from "./meta-page-picker-dialog.tsx";

export function FacebookConfigModal({
  opened,
  close,
  selectedWaSettings,
}: Readonly<{
  opened: boolean;
  close: () => void;
  selectedWaSettings: WaSetting | null;
}>) {
  const { t: translations } = useTranslation();

  return (
    <MetaPagePickerDialog
      opened={opened}
      close={close}
      selectedWaSettings={selectedWaSettings}
      title={translations("Which Facebook Page do you want to connect?")}
      description={translations(
        "Messenger conversations from the Page you select will arrive in your inbox. You can change or disconnect it later.",
      )}
      countLabel={(count) => translations("All Facebook Pages ({count})", { count })}
      emptyText={translations(
        "No Pages found. Make sure you gave access to your Page on Facebook, then sync again.",
      )}
      savedPageId={(setting) => setting.fbPageId || null}
      // Unlinking the Page also unlinks Instagram — it hangs off the Page — which the
      // API does when fbPageId is cleared.
      toPayload={(page) =>
        page
          ? { fbPageId: page.id, pageAccessToken: page.access_token }
          : { fbPageId: null, pageAccessToken: null }
      }
    />
  );
}
