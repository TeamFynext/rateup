import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";

/**
 * Whether RateUp for WooCommerce is listed on WordPress.org. It was submitted on
 * 2026-10-17 and is in review; set this to true once it is approved and published,
 * so merchants are sent to WordPress's plugin search instead of told to wait.
 */
export const WOO_PLUGIN_LISTED = false;

/** As the plugin is named on WordPress.org. */
const PLUGIN_NAME = "RateUp for WooCommerce";

/**
 * How to install the RateUp for WooCommerce plugin: from WordPress.org, through the store's
 * own plugin search, which RateUp can open directly since it knows the store's address.
 */
export function WooPluginInstall({ storeUrl }: Readonly<{ storeUrl: string }>) {
  const { t } = useTranslation();

  if (!WOO_PLUGIN_LISTED) {
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          "The RateUp plugin is being reviewed by WordPress.org and will be available to install soon.",
        )}
      </p>
    );
  }

  const search = new URLSearchParams({ s: PLUGIN_NAME, tab: "search", type: "term" });
  return (
    <div className="flex flex-col gap-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          {t("In WordPress, go to Plugins › Add New Plugin and search for “{name}”.", {
            name: PLUGIN_NAME,
          })}
        </li>
        <li>{t("Click Install Now, then Activate Plugin.")}</li>
      </ol>
      <div>
        <Button
          variant="outline"
          render={
            <a
              href={`${storeUrl}/wp-admin/plugin-install.php?${search}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          {t("Find it in WordPress")}
          <IconExternalLink data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
