import { Button } from "@rateup/ui/components/button";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import PaymentTab from "@/components/dashboard/whatsapp/orders-and-payments/components/PaymentTab";

import { CatalogCheckoutTabs } from "../CatalogCheckoutTabs";
import { useCommerce } from "../CommerceContext";
import { SHOP_PATHS } from "../shop/shopMeta.ts";
import { ShopSection } from "../shop/ShopUi.tsx";

/** The older tools that work on the Meta catalog directly instead of on Commerce products. */
export function LegacyTab() {
  const { t } = useTranslation();
  const { catalogId, isCatalogConnected, isShopifyConnected } = useCommerce();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ShopSection
        title={t("WhatsApp catalog tools")}
        description={t(
          "From before Commerce had its own products. Manage items straight in the Meta catalog and see orders sent from the catalog cart. New shops don't need these.",
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={SHOP_PATHS.catalogs} />}>
            {t("Catalog products")}
            <IconArrowRight data-icon="inline-end" />
          </Button>
          <Button variant="outline" render={<Link to={SHOP_PATHS.catalogOrders} />}>
            {t("Catalog orders")}
            <IconArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </ShopSection>
      {isCatalogConnected && (
        <>
          <ShopSection
            title={t("Catalog cart checkout")}
            description={t("What the catalog cart asks for and how it delivers.")}
          >
            <CatalogCheckoutTabs catalogId={catalogId} />
          </ShopSection>
          <ShopSection
            title={t("Catalog cart payments")}
            description={t(
              "Payment settings for the older checkout that runs on the WhatsApp catalog's own order message.",
            )}
          >
            <PaymentTab catalogId={catalogId} isShopifyConnected={isShopifyConnected} />
          </ShopSection>
        </>
      )}
    </div>
  );
}
