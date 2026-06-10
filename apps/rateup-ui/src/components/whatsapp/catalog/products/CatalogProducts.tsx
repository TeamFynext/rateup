"use client";

import React from "react";

import { useDisclosure } from "@mantine/hooks";
import { IconBrandMeta, IconPlus, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  useSyncCatalogProducts,
  useSyncShopifyWithCatalog,
} from "@/backend/whatsapp/catalog/products/products.query";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

import { AddCatalogProductModal } from "./AddCatalogProduct.tsx";
import ProductItems from "./ProductItems.tsx";

const CatalogProducts = ({ catalogData }) => {
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const syncFromMetaMut = useSyncCatalogProducts(catalogData?.catalogId);
  const syncFromShopifyMut = useSyncShopifyWithCatalog(catalogData?.catalogId);

  function handleSyncFromMeta(data = null) {
    toast.loading("Syncing products from Meta...", {
      id: "sync-catalog-products-meta",
    });
    syncFromMetaMut.mutate(data, {
      onSuccess: (res: any) => {
        toast.success("Products synced from Meta", {
          id: "sync-catalog-products-meta",
        });
        if (res?.hasNextPage) {
          handleSyncFromMeta({ limit: 50, next: res.next });
        }
      },
      onError: (error) => {
        toast.error(error?.message || "Sync from Meta failed", {
          id: "sync-catalog-products-meta",
        });
      },
    });
  }

  function handleSyncFromShopify() {
    toast.loading("Syncing products from Shopify...", {
      id: "sync-catalog-products-shopify",
    });
    syncFromShopifyMut.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(
          `Sync complete — ${data.updated} updated, ${data.unchanged} unchanged`,
          {
            id: "sync-catalog-products-shopify",
          },
        );
      },
      onError: (error) => {
        toast.error(error?.message || "Shopify sync failed", {
          id: "sync-catalog-products-shopify",
        });
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button disabled={!catalogData} onClick={openAdd}>
            <IconPlus size={15} className="mr-1" />
            Add Product
          </Button>
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
    </div>
  );
};

export default CatalogProducts;
