import { Button } from "@rateup/ui/components/button";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { ShopifyWidgetData } from "@/backend/appsIntegration/shopify/shopify.api";
import {
  useSaveShopifyWidget,
  useShopifyWidget,
} from "@/backend/appsIntegration/shopify/shopify.query";
import {
  StoreWidgetEditor,
  StoreWidgetLoadError,
  StoreWidgetSkeleton,
} from "@/components/integrations/storeWidget/StoreWidgetEditor.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

/** The one-time step that puts the button on a Shopify storefront: the theme's app embed. */
function ThemeEmbedCard({ data }: Readonly<{ data: ShopifyWidgetData }>) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Turn it on in your theme")}</CardTitle>
        <CardDescription>
          {t(
            "One last step, once: switch on “WhatsApp chat button” under App embeds in your Shopify theme, then save the theme.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.themeEditorUrl ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={data.themeEditorUrl} target="_blank" rel="noopener noreferrer" />}
          >
            {t("Open the theme editor")}
            <IconExternalLink data-icon="inline-end" />
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("In Shopify, go to Online Store › Themes › Customize › App embeds.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** The storefront WhatsApp button: its settings, a live preview and how often it is tapped. */
export default function ShopifyWidget() {
  const { t } = useTranslation();
  const query = useShopifyWidget();
  const save = useSaveShopifyWidget();
  const canEdit = usePermissions().can("integrations.shopify");

  if (query.isPending) return <StoreWidgetSkeleton />;
  if (query.isError) {
    return <StoreWidgetLoadError error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <StoreWidgetEditor
      data={query.data}
      canEdit={canEdit}
      noPermissionHint={t("Ask an admin for the Shopify integration permission.")}
      sampleProductUrl={`https://${query.data.shop}/products/classic-cotton-tee`}
      collectionLabel={t("Collection pages")}
      save={save}
      storeCard={<ThemeEmbedCard data={query.data} />}
    />
  );
}
