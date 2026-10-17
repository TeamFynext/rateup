import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";

/** Built by rateup-wordpress/build.mjs --publish into public/downloads. */
export const WOO_PLUGIN_DOWNLOAD_URL = "/downloads/rateup-for-woocommerce.zip";

/**
 * How to install the RateUp for WooCommerce plugin: the zip, and the store's own
 * "Upload Plugin" screen, which RateUp can open directly since it knows the store's address.
 */
export function WooPluginInstall({ storeUrl }: Readonly<{ storeUrl: string }>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{t("Download the plugin.")}</li>
        <li>
          {t("In WordPress, go to Plugins › Add New Plugin › Upload Plugin and choose the file.")}
        </li>
        <li>{t("Click Install Now, then Activate Plugin.")}</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          render={<a href={WOO_PLUGIN_DOWNLOAD_URL} download="rateup-for-woocommerce.zip" />}
        >
          <IconDownload data-icon="inline-start" />
          {t("Download plugin")}
        </Button>
        <Button
          variant="ghost"
          render={
            <a
              href={`${storeUrl}/wp-admin/plugin-install.php?tab=upload`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          {t("Open Upload Plugin")}
          <IconExternalLink data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
