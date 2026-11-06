import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import { IconClipboardList, IconMapPin, IconTruck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import CollectionOptionsTab from "@/components/dashboard/commerce/CollectionOptionsTab";
import AddressFieldsTab from "@/components/dashboard/whatsapp/orders-and-payments/components/AddressFieldsTab";
import DeliveryOptionsTab from "@/components/dashboard/whatsapp/orders-and-payments/components/DeliveryOptionsTab";

/** The WhatsApp catalog cart's own checkout options: what it collects and how it delivers. */
export function CatalogCheckoutTabs({ catalogId }: Readonly<{ catalogId: string }>) {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="collection" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="collection">
          <IconClipboardList data-icon="inline-start" />
          {t("Collection")}
        </TabsTrigger>
        <TabsTrigger value="address">
          <IconMapPin data-icon="inline-start" />
          {t("Address Fields")}
        </TabsTrigger>
        <TabsTrigger value="delivery">
          <IconTruck data-icon="inline-start" />
          {t("Delivery Options")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="collection" className="mt-0">
        <CollectionOptionsTab catalogId={catalogId} />
      </TabsContent>
      <TabsContent value="address" className="mt-0">
        <AddressFieldsTab catalogId={catalogId} />
      </TabsContent>
      <TabsContent value="delivery" className="mt-0">
        <DeliveryOptionsTab catalogId={catalogId} />
      </TabsContent>
    </Tabs>
  );
}
