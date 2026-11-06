import { IconCircleCheck, IconPlug } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { WooWidgetData } from "@/backend/appsIntegration/woocommerce/woocommerce.api";
import {
  useCheckWooPlugin,
  useSaveWooWidget,
  useWooWidget,
} from "@/backend/appsIntegration/woocommerce/woocommerce.query";
import {
  StoreWidgetEditor,
  StoreWidgetLoadError,
  StoreWidgetSkeleton,
} from "@/components/integrations/storeWidget/StoreWidgetEditor.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { WooPluginInstall } from "./WooPluginInstall.tsx";

/**
 * How the button reaches a WooCommerce store: the RateUp for WooCommerce plugin. Says
 * whether RateUp reached it last time, and offers "Check again" after installing it.
 */
function PluginCard({ data }: Readonly<{ data: WooWidgetData }>) {
  const { t } = useTranslation();
  const check = useCheckWooPlugin();
  const installed = data.plugin?.installed === true;

  const handleCheck = () =>
    check.mutate(undefined, {
      onSuccess: (widget) => {
        if (widget.plugin?.installed) toast.success(t("The RateUp plugin is installed."));
        else toast.error(t("The plugin wasn't found. Install and activate it, then check again."));
      },
      onError: (error) => toast.error(getApiErrorMessage(error, t("Something went wrong"))),
    });

  if (installed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCircleCheck className="size-4 text-green-600 dark:text-green-500" />
            {t("RateUp plugin installed")}
          </CardTitle>
          <CardDescription>
            {t("Changes you save here show on your store straight away.")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconPlug className="size-4 text-muted-foreground" />
          {t("Install the RateUp plugin")}
        </CardTitle>
        <CardDescription>
          {t(
            "The button is shown on your store by the RateUp for WooCommerce plugin. Install it, then check again.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WooPluginInstall storeUrl={data.storeUrl} />
        <div>
          <Button loading={check.isPending} onClick={handleCheck}>
            {t("Check again")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** The storefront WhatsApp button for a WooCommerce store, shown by the RateUp plugin. */
export function WooWidget() {
  const { t } = useTranslation();
  const query = useWooWidget();
  const save = useSaveWooWidget();
  const canEdit = usePermissions().can("integrations.manage");

  if (query.isPending) return <StoreWidgetSkeleton />;
  if (query.isError) {
    return <StoreWidgetLoadError error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <StoreWidgetEditor
      data={query.data}
      canEdit={canEdit}
      noPermissionHint={t("Ask an admin for the integrations permission.")}
      sampleProductUrl={`${query.data.storeUrl}/product/classic-cotton-tee/`}
      collectionLabel={t("Shop and category pages")}
      save={save}
      storeCard={<PluginCard data={query.data} />}
    />
  );
}
