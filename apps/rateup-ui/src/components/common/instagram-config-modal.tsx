import { useTranslation } from "react-i18next";

import { MetaPagePickerDialog, type WaSetting } from "./meta-page-picker-dialog.tsx";

export function InstagramConfigModal({
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
      title={translations("Which Instagram Business account do you want to connect?")}
      description={translations(
        "Instagram connects through the Facebook Page it's linked to. DMs and story replies will arrive in your inbox. You can change or disconnect it later.",
      )}
      countLabel={(count) => translations("All Instagram Business accounts ({count})", { count })}
      emptyText={translations(
        "No Pages found. Make sure you gave access to your Page on Facebook, then sync again.",
      )}
      unavailableHint={translations("No Instagram Business account linked to this Page")}
      // Only an Instagram connection counts here — a Page connected for Messenger
      // alone shouldn't show as ticked.
      savedPageId={(setting) => (setting.ibaId ? setting.fbPageId || null : null)}
      isPickable={(page) => !!page.instagram_business_account}
      // Disconnecting clears only Instagram's own field; the Page and Messenger on it
      // stay connected (the API clears the Instagram username with it).
      toPayload={(page) =>
        page?.instagram_business_account
          ? {
              fbPageId: page.id,
              pageAccessToken: page.access_token,
              ibaId: page.instagram_business_account.id,
            }
          : { ibaId: null }
      }
      // The Instagram account is what's being connected, so show its face, not the Page's.
      pageImage={(page) => page.instagram_business_account?.profile_picture_url ?? page.pictureUrl}
      pageSubtitle={(page) => {
        const username = page.instagram_business_account?.username;
        return username ? `@${username}` : undefined;
      }}
    />
  );
}
