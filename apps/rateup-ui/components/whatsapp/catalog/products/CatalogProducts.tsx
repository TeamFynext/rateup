"use client";

import React from "react";

import { Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBrandMeta,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconShoppingBag,
  IconX,
} from "@tabler/icons-react";

import {
  useSyncCatalogProducts,
  useSyncShopifyWithCatalog,
} from "@/backend/whatsapp/catalog/products/products.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Title order={3}>Products</Title>
          <RateupButtonPrimary
            title="Add Product"
            disabled={!catalogData}
            onClick={openAdd}
            leftIcon={<IconPlus size={15} />}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!catalogData}
                aria-label="Sync products"
              >
                <IconRefresh size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              {/* <DropdownMenuItem
                className="text-green-600 focus:text-green-700 focus:bg-green-50"
                onClick={handleSyncFromShopify}
                disabled={syncFromShopifyMut.isPending}
              >
                <IconShoppingBag size={16} className="mr-2" />
                Sync from Shopify
              </DropdownMenuItem> */}
              <DropdownMenuItem
                className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                onClick={() => handleSyncFromMeta()}
                disabled={syncFromMetaMut.isPending}
              >
                <IconBrandMeta size={16} className="mr-2" />
                Sync from Meta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
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
