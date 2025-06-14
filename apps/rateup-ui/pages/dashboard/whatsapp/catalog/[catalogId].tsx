import React from "react";
import { useRouter } from "next/router";

import { Tabs, TabsList } from "@mantine/core";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import CatalogSettings from "@/components/whatsapp/catalog/CatalogSettings";
import CatalogOrders from "@/components/whatsapp/catalog/orders/CatalogOrders";
import CatalogProducts from "@/components/whatsapp/catalog/products/CatalogProducts";

const CatalogID = () => {
  const router = useRouter();
  const { catalogId } = router.query;
  const { data: catalogInfo, isPending } =
    useWaCatalog(catalogId).getCatalogInfo;
  if (isPending) return <RateupLoader />;
  return (
    <>
      <Tabs defaultValue="products">
        <TabsList>
          <Tabs.Tab value="products">Products</Tabs.Tab>
          <Tabs.Tab value="orders">Orders</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </TabsList>
        <Tabs.Panel value="products" p={"xl"}>
          <CatalogProducts catalogData={catalogInfo} />
        </Tabs.Panel>
        <Tabs.Panel value="orders" p={"xl"}>
          <CatalogOrders catalogId={catalogInfo?.catalogId} />
        </Tabs.Panel>
        <Tabs.Panel value="settings" p={"xl"}>
          <CatalogSettings catalogData={catalogInfo} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};

export default CatalogID;
