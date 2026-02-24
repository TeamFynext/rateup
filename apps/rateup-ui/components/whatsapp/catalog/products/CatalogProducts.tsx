"use client";

import React from "react";

import { Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconPlus, IconRefresh, IconShoppingBag, IconX } from "@tabler/icons-react";

import { useSyncCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import { AddCatalogProductModal } from "./AddCatalogProduct";
import { ImportFromShopifyModal } from "./ImportFromShopifyModal";
import ProductItems from "./ProductItems";

const CatalogProducts = ({ catalogData }) => {
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [shopifyOpened, { open: openShopify, close: closeShopify }] =
    useDisclosure(false);
  const syncProductsMut = useSyncCatalogProducts(catalogData?.catalogId);

  function syncProducts(data = null) {
    showLoadingToast(
      "Syncing next 50 products...",
      "sync-catalog-product",
      true,
      "",
      "",
      false,
    );
    syncProductsMut.mutate(data, {
      onSuccess: (data) => {
        showSuccessToast(
          "product synced for 50 items",
          "sync-catalog-product",
          <IconCheck />,
          true,
        );
        if (data.hasNextPage) {
          syncProducts({ limit: 50, next: data.next });
        }
      },
      onError: () => {
        showErrorToast(
          "syncing failed",
          "sync-catalog-product",
          <IconX />,
          true,
        );
      },
    });
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap={"xs"}>
          <Title order={3}>Products</Title>
          <RateupButtonPrimary
            title="Add Product"
            disabled={!catalogData}
            onClick={openAdd}
            leftIcon={<IconPlus size={15} />}
          />
          <RateupButtonPrimary
            title="Import from Shopify"
            disabled={!catalogData}
            onClick={openShopify}
            leftIcon={<IconShoppingBag size={15} />}
          />
        </Group>
        <RateupButtonPrimary
          title="Sync Products"
          disabled={!catalogData}
          onClick={() => syncProducts()}
          leftIcon={<IconRefresh size={15} />}
        />
      </Group>
      {catalogData?.vertical === "commerce" && (
        <ProductItems catalogId={catalogData?.catalogId} />
      )}
      <AddCatalogProductModal
        catalogData={catalogData}
        opened={addOpened}
        close={closeAdd}
      />
      <ImportFromShopifyModal
        catalogId={catalogData?.catalogId}
        opened={shopifyOpened}
        onClose={closeShopify}
      />
    </Stack>
  );
};

export default CatalogProducts;
