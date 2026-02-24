"use client";

import React from "react";

import { ActionIcon, Group, Menu, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBrandMeta,
  IconCheck,
  IconDotsVertical,
  IconPlus,
  IconShoppingBag,
  IconX,
} from "@tabler/icons-react";

import {
  useSyncCatalogProducts,
  useSyncShopifyWithCatalog,
} from "@/backend/whatsapp/catalog/products/products.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import { AddCatalogProductModal } from "./AddCatalogProduct";
import ProductItems from "./ProductItems";

const CatalogProducts = ({ catalogData }) => {
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const syncFromMetaMut = useSyncCatalogProducts(catalogData?.catalogId);
  const syncFromShopifyMut = useSyncShopifyWithCatalog(catalogData?.catalogId);

  function handleSyncFromMeta(data = null) {
    showLoadingToast(
      "Syncing products from Meta...",
      "sync-catalog-products-meta",
      true,
      "",
      "",
      false,
    );
    syncFromMetaMut.mutate(data, {
      onSuccess: (res: any) => {
        showSuccessToast(
          "Products synced from Meta",
          "sync-catalog-products-meta",
          <IconCheck />,
          true,
        );
        if (res?.hasNextPage) {
          handleSyncFromMeta({ limit: 50, next: res.next });
        }
      },
      onError: () => {
        showErrorToast(
          "Sync from Meta failed",
          "sync-catalog-products-meta",
          <IconX />,
          true,
        );
      },
    });
  }

  function handleSyncFromShopify() {
    showLoadingToast(
      "Syncing products from Shopify...",
      "sync-catalog-products-shopify",
      true,
      "",
      "",
      false,
    );
    syncFromShopifyMut.mutate(undefined, {
      onSuccess: (data) => {
        showSuccessToast(
          `Sync complete — ${data.updated} updated, ${data.unchanged} unchanged`,
          "sync-catalog-products-shopify",
          <IconCheck />,
          true,
        );
      },
      onError: () => {
        showErrorToast(
          "Shopify sync failed",
          "sync-catalog-products-shopify",
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
        </Group>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              disabled={!catalogData}
              aria-label="More actions"
            >
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Sync</Menu.Label>
            <Menu.Item
              color="green"
              leftSection={<IconShoppingBag size={16} />}
              onClick={handleSyncFromShopify}
              disabled={syncFromShopifyMut.isPending}
            >
              Sync from Shopify
            </Menu.Item>
            <Menu.Item
              color="blue"
              leftSection={<IconBrandMeta size={16} />}
              onClick={() => handleSyncFromMeta()}
              disabled={syncFromMetaMut.isPending}
            >
              Sync from Meta
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      {catalogData?.vertical === "commerce" && (
        <ProductItems catalogId={catalogData?.catalogId} />
      )}
      <AddCatalogProductModal
        catalogData={catalogData}
        opened={addOpened}
        close={closeAdd}
      />
    </Stack>
  );
};

export default CatalogProducts;
