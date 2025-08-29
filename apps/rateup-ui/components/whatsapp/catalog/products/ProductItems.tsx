"use client";

import React, { useState } from "react";

import {
  ActionIcon,
  Card,
  Group,
  Image,
  SimpleGrid,
  Spoiler,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconEdit, IconTrash, IconX } from "@tabler/icons-react";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import { fallbackImage } from "@/utils/constants";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import { AddCatalogProductModal } from "./AddCatalogProduct";

const ProductItems = ({ catalogId }) => {
  const { productQuery, deleteProducts } = useWaCatalogProducts(catalogId);
  const { data: catalog, isPending } = useWaCatalog(catalogId).getCatalogInfo;
  const { data: products, isLoading } = productQuery;
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  if (isLoading || isPending) return <RateupLoader />;
  if (!products || !products.length) {
    return <NothingFound text="No products found" />;
  }

  const extraProps = [
    { key: "brand", label: "Brand" },
    { key: "color", label: "Color" },
    { key: "size", label: "Size" },
    { key: "pattern", label: "Pattern" },
    { key: "gender", label: " Gender" },
    { key: "age_group", label: "Age Group" },
  ];
  function handleOpenEdit(product) {
    const {
      currency,
      price,
      base_price,
      sale_price,
      image,
      image_link,
      addition_image_link,
      url,
      ...rest
    } = product.productProps;
    const formattedProduct = {
      currencyCode: currency,
      ...(price
        ? {
            price: parseFloat(price.replace(/[^0-9.-]+/g, "")),
          }
        : {}),
      ...(base_price
        ? {
            base_price: parseFloat(base_price.replace(/[^0-9.-]+/g, "")),
          }
        : {}),
      ...(sale_price
        ? {
            sale_price: parseFloat(sale_price.replace(/[^0-9.-]+/g, "")),
          }
        : {}),
      ...(image?.length || image_link.length
        ? {
            image: image ?? [{ url: image_link, tag: [] }],
          }
        : {}),
      link: url,
      ...rest,
    };
    setSelectedProduct({ ...product, ...formattedProduct });
    open();
  }
  const { vertical } = catalog;
  function handleDelete(product) {
    showLoadingToast(
      "Hold on...deleting..",
      "delete-catalog-product",
      true,
      "Loading",
      "",
      false,
    );

    let productIds = [];
    if (vertical === "commerce") {
      productIds = [{ id: product.retailer_id }];
    } else if (vertical === "hotels") {
      productIds = [{ id: product.hotel_id }];
    } else if (vertical === "hotel_room") {
      productIds = [
        {
          id: product.hotel_room_id,
          hotel_retailer_id: product.hotel_retailer_id,
        },
      ];
    }
    deleteProducts.mutate(
      { productIds },
      {
        onSuccess: () => {
          showSuccessToast(
            "product deleted",
            "delete-catalog-product",
            <IconCheck />,
            true,
          );
        },
        onError: () => {
          showErrorToast(
            "product deletion failed",
            "delete-catalog-product",
            <IconX />,
            true,
          );
        },
      },
    );
  }
  return (
    <SimpleGrid cols={{ base: 2, sm: 2, md: 3, lg: 4, xl: 4, xs: 1 }}>
      {products.map((product) => {
        const { productProps } = product;
        return (
          <Card
            key={product.id ?? product.rerailer_id}
            shadow="sm"
            withBorder
            radius={"sm"}
          >
            {vertical == "commerce" ? (
              <>
                <Card.Section withBorder inheritPadding py="xs">
                  <Group justify="flex-end" gap={"xs"}>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => handleOpenEdit(product)}
                    >
                      <IconEdit size={20} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(product)}
                      disabled={deleteProducts.isPending}
                    >
                      <IconTrash size={20} />
                    </ActionIcon>
                  </Group>
                </Card.Section>
                <Card.Section>
                  <Image
                    fallbackSrc={fallbackImage}
                    src={
                      productProps.image_link || productProps.image?.[0]?.url
                    }
                    h={200}
                  />
                </Card.Section>
                <Spoiler
                  maxHeight={100}
                  showLabel="See more.."
                  hideLabel="See less"
                >
                  <Text fw={500} truncate>
                    {productProps.title ?? productProps.name}
                  </Text>
                  <Text c={"dimmed"} truncate>
                    {productProps.description}
                  </Text>
                  <Text size="lg">
                    {productProps.sale_price ?? productProps.price}
                  </Text>
                  {productProps.sale_price &&
                    productProps.sale_price !== productProps.price && (
                      <Text size="sm" td={"line-through"} c="dimmed">
                        M.R.P.: {productProps.price}
                      </Text>
                    )}
                  <Stack gap={2}>
                    {extraProps.map((pp) => (
                      <Group justify="space-between" key={pp.key}>
                        <Text size="sm" fw={500}>
                          {pp.label}
                        </Text>
                        <Text size="sm" c={"dimmed"}>
                          {productProps[pp.key]}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                  {productProps.url && (
                    <>
                      <Text fw={400} size="sm">
                        Website Link
                      </Text>
                      <Text size="sm" c={"dimmed"}>
                        {productProps.url}
                      </Text>
                    </>
                  )}
                </Spoiler>
              </>
            ) : (
              <Text>{vertical} item not supported yet.</Text>
            )}
          </Card>
        );
      })}
      <AddCatalogProductModal
        catalogData={{ catalogId, vertical }}
        opened={opened}
        close={close}
        productData={selectedProduct}
      />
    </SimpleGrid>
  );
};

export default ProductItems;
