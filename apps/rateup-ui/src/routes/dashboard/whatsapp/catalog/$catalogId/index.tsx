import { createFileRoute, useParams } from "@tanstack/react-router";
import React from "react";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import CatalogSettings from "@/components/whatsapp/catalog/CatalogSettings.tsx";
import CatalogOrders from "@/components/whatsapp/catalog/orders/CatalogOrders.tsx";
import CatalogProducts from "@/components/whatsapp/catalog/products/CatalogProducts.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/catalog/$catalogId/")({
  component: CatalogID,
});

function CatalogID() {
  const params = useParams({
    strict: false,
  });
  const catalogId = params?.catalogId as string;

  const { data: catalogInfo, isPending } = useWaCatalog(catalogId);
  if (isPending) return <RateupLoader />;
  return (
    <Tabs defaultValue="products" className="w-full">
      <TabsList>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <CatalogProducts catalogData={catalogInfo} />
      </TabsContent>
      <TabsContent value="orders">
        <CatalogOrders catalogId={catalogInfo?.catalogId} />
      </TabsContent>
      <TabsContent value="settings">
        <CatalogSettings catalogData={catalogInfo} />
      </TabsContent>
    </Tabs>
  );
}
