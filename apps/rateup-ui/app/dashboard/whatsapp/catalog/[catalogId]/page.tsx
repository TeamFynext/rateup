"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CatalogSettings from "@/components/whatsapp/catalog/CatalogSettings";
import CatalogOrders from "@/components/whatsapp/catalog/orders/CatalogOrders";
import CatalogProducts from "@/components/whatsapp/catalog/products/CatalogProducts";

const CatalogID = () => {
  const params = useParams();
  const catalogId = params?.catalogId as string;

  const { data: catalogInfo, isPending } = useWaCatalog(catalogId);
  if (isPending) return <RateupLoader />;
  return (
    <>
      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="p-6">
          <CatalogProducts catalogData={catalogInfo} />
        </TabsContent>
        <TabsContent value="orders" className="p-6">
          <CatalogOrders catalogId={catalogInfo?.catalogId} />
        </TabsContent>
        <TabsContent value="settings" className="p-6">
          <CatalogSettings catalogData={catalogInfo} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default CatalogID;
