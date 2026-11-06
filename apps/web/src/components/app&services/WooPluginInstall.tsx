import { Button } from "@rateup/ui/components/button";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

/**
 * Whether RateUp for WooCommerce is listed on WordPress.org: approved 2026-10-20. While
 * false, the install cards say the plugin is in review instead of sending merchants to it.
 */
export const WOO_PLUGIN_LISTED = true;

/** As the plugin is named on WordPress.org. */
const PLUGIN_NAME = "RateUp for WooCommerce";
const PLUGIN_SLUG = "rateup-for-woocommerce";

/**
 * How to install the RateUp for WooCommerce plugin from WordPress.org. The button opens the
 * plugin's own page in the store's admin, with its Install Now button: looked up by slug, it
 * works as soon as the plugin is published, while WordPress's search can take days to list it.
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

  const details = new URLSearchParams({ tab: "plugin-information", plugin: PLUGIN_SLUG });
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
              href={`${storeUrl}/wp-admin/plugin-install.php?${details}`}
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
