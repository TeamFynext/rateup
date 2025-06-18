import React from "react";

import { Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconPlus, IconRefresh, IconX } from "@tabler/icons-react";

import { useWaCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import { AddCatalogProductModal } from "./AddCatalogProduct";
import ProductItems from "./ProductItems";

const CatalogProducts = ({ catalogData }) => {
  const [opened, { open, close }] = useDisclosure(false);
  const { syncProducts: syncProductsMut } = useWaCatalogProducts(
    catalogData?.catalogId,
  );

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
            onClick={open}
            leftIcon={<IconPlus size={15} />}
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
        opened={opened}
        close={close}
      />
    </Stack>
  );
};

export default CatalogProducts;
