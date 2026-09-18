import { IconExternalLink } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import type { ShopifyProduct } from "@/backend/appsIntegration/shopify/shopify.api";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { IntegrationEmptyState } from "@/components/dashboard/settings/integrations/IntegrationEmptyState.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import ShopifySchedules from "@/components/shopify/ShopifySchedules.tsx";
import ShopifySettings from "@/components/shopify/ShopifySettings.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils.ts";
import { IntegratedApps } from "@/types/enums.ts";
import type { ShopifyIntegration } from "@/types/global";

interface ActiveBadgeProps extends React.ComponentProps<typeof Badge> {
  active?: boolean;
}

export function ActiveStatusBadge({ active, className, ...props }: ActiveBadgeProps) {
  const { t: translations } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={cn(
        active
          ? "border-green-200 bg-green-100 text-green-700"
          : "border-red-200 bg-red-100 text-red-700",
        className,
      )}
      {...props}
    >
      {active ? translations("ACTIVE") : translations("INACTIVE")}
    </Badge>
  );
}

export function Shopify() {
  const { data: shopifyInfo, isLoading } = useIntegrationByType(IntegratedApps.shopify) as {
    data: ShopifyIntegration;
    isLoading: boolean;
  };
  const { data: templates } = useWaTemplates();
  const { data: teams } = useTeamsByUser();
  const { t: translations } = useTranslation();
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);

  const handleLoadProducts = async () => {
    try {
      toast.loading(translations("Syncing Shopify products"), {
        id: "shopify-products",
      });
      const products = await getProductsFromShopify();
      setShopifyProducts(products ?? []);
      toast.success(translations("Products loaded successfully"), {
        id: "shopify-products",
      });
    } catch {
      toast.error(translations("Product syncing failed"), {
        id: "shopify-products",
      });
    }
  };

  if (isLoading) return <RateupLoader />;

  const config = INTEGRATIONS_CONFIG.shopify;
  const shopDomain = shopifyInfo?.credential?.session?.shop;

  if (!shopifyInfo || !shopifyInfo?.active || !shopifyInfo.credential.session)
    return (
      <IntegrationShell icon={config.icon} name={config.name}>
        <IntegrationEmptyState
          icon={config.icon}
          title={translations("Connect your Shopify store")}
          description={translations(
            "Orders and customers flow into RateUp, so you can follow up on WhatsApp after someone buys.",
          )}
          benefits={[
            translations("Send order updates and delivery notices automatically"),
            translations("Bring product details into your campaigns"),
            translations("Win back abandoned carts"),
          ]}
          action={
            <Button onClick={() => window.open("https://apps.shopify.com/rateup", "_blank")}>
              {translations("Install on Shopify")}
              <IconExternalLink data-icon="inline-end" />
            </Button>
          }
        />
      </IntegrationShell>
    );

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected
      detail={shopDomain}
      action={
        <Button variant="outline" onClick={handleLoadProducts}>
          {translations("Sync products")}
        </Button>
      }
    >
      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="schedules">{translations("Schedules")}</TabsTrigger>
          <TabsTrigger value="settings">{translations("Settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="schedules">
          <ShopifySchedules
            shopifyProducts={shopifyProducts}
            shopifyInfo={shopifyInfo}
            waTemplates={templates ?? []}
            teams={teams?.data ?? []}
          />
        </TabsContent>
        <TabsContent value="settings">
          <ShopifySettings shopifyInfo={shopifyInfo} />
        </TabsContent>
      </Tabs>
    </IntegrationShell>
  );
}
