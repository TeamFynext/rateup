import { IconPlus } from "@tabler/icons-react";
import { Image } from "@unpic/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
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
  const [shopifyProducts, setShopifyProducts] = useState([]);

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

  if (!shopifyInfo || !shopifyInfo?.active || !shopifyInfo.credential.session)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/images/shopifystore.jpeg"
            alt="Shopify Store"
            width={320}
            height={240}
            className="max-w-xs"
          />
          <Button
            style={{ backgroundColor: "#5e8e3e" }}
            onClick={() => window.open("https://apps.shopify.com/rateup", "_blank")}
          >
            <IconPlus data-icon="inline-start" />
            {translations("Connect with shopify store")}
          </Button>
        </div>
      </div>
    );

  return (
    <Tabs defaultValue="schedules" className="w-full h-full">
      <div className="mb-4 flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="schedules">{translations("Schedules")}</TabsTrigger>
          <TabsTrigger value="settings">{translations("Settings")}</TabsTrigger>
        </TabsList>
        <Button variant="outline" onClick={handleLoadProducts}>
          {translations("Sync products")}
        </Button>
      </div>
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
  );
}
