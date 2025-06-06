import React, { useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Card,
  Center,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Skeleton,
  Spoiler,
  Stack,
  Tabs,
  TabsList,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  ContainedSwitchInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import { AddCatalogProductModal } from "@/components/whatsapp/catalog/products/AddCatalogProduct";
import { fallbackImage } from "@/utils/constants";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

const CatalogID = () => {
  const router = useRouter();
  const { catalogId } = router.query;
  const { productQuery } = useWaCatalogProducts(catalogId);
  const { data: catalogInfo, isPending } = productQuery;
  if (isPending) return <RateupLoader />;
  return (
    <>
      <Tabs defaultValue="products">
        <TabsList>
          <Tabs.Tab value="products">Products</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </TabsList>
        <Tabs.Panel value="products" p={"xl"}>
          <CatalogProducts catalogData={catalogInfo} />
        </Tabs.Panel>
        <Tabs.Panel value="settings" p={"xl"}>
          <CatalogSettings catalogData={catalogInfo} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};

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
        <ProductsItems catalogId={catalogData?.catalogId} />
      )}
      <AddCatalogProductModal
        catalogData={catalogData}
        opened={opened}
        close={close}
      />
    </Stack>
  );
};

const ProductsItems = ({ catalogId }) => {
  const { productQuery, deleteProducts } = useWaCatalogProducts(catalogId);
  const { data, isLoading } = productQuery;
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  if (isLoading) return <RateupLoader />;
  if (!data?.products || !data.products.length) {
    return <NothingFound text="No products found" />;
  }

  const productProps = [
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
    } = product;
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
    setSelectedProduct(formattedProduct);
    open();
  }

  function handleDelete(product) {
    showLoadingToast(
      "Hold on...deleting..",
      "delete-catalog-product",
      true,
      "Loading",
      "",
      false,
    );
    const { vertical } = data;
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
      {data.products.map((product) => (
        <Card key={product.id} shadow="sm" withBorder radius={"sm"}>
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
              src={product.image_link || product.image?.[0]?.url}
              h={200}
            />
          </Card.Section>
          <Spoiler maxHeight={100} showLabel="See more.." hideLabel="See less">
            <Text fw={500} truncate>
              {product.title ?? product.name}
            </Text>
            <Text c={"dimmed"} truncate>
              {product.description}
            </Text>
            <Text size="lg">{product.sale_price ?? product.price}</Text>
            {product.sale_price && product.sale_price !== product.price && (
              <Text size="sm" td={"line-through"} c="dimmed">
                M.R.P.: {product.price}
              </Text>
            )}
            <Stack gap={2}>
              {productProps.map((pp) => (
                <Group justify="space-between" key={pp.key}>
                  <Text size="sm" fw={500}>
                    {pp.label}
                  </Text>
                  <Text size="sm" c={"dimmed"}>
                    {product[pp.key]}
                  </Text>
                </Group>
              ))}
            </Stack>
            {product.url && (
              <>
                <Text fw={400} size="sm">
                  Website Link
                </Text>
                <Text size="sm" c={"dimmed"}>
                  {product.url}
                </Text>
              </>
            )}
          </Spoiler>
        </Card>
      ))}
      <AddCatalogProductModal
        catalogData={{ catalogId, vertical: data.vertical }}
        opened={opened}
        close={close}
        productData={selectedProduct}
      />
    </SimpleGrid>
  );
};

const CatalogSettings = ({ catalogData }) => {
  const { update } = useWaCatalog(catalogData?.catalogId);
  function handleSwitch(checked) {
    update.mutate({ isWhatsappConnected: checked });
  }
  return (
    <Stack>
      <ContainedTextField
        value={catalogData.catalogId}
        disabled
        label={"Catalog ID"}
      />
      <ContainedTextField
        value={catalogData.name}
        disabled
        label={"Catalog Name"}
      />
      <ContainedTextField
        value={catalogData.vertical}
        disabled
        label={"Catalog vertical"}
      />
      <Group>
        <ContainedSwitchInput
          checked={catalogData.isWhatsappConnected}
          label={"Connect to WhatsApp"}
          onChange={(e) => handleSwitch(e.currentTarget.checked)}
        />
        {update.isPending && <Loader size={"sm"} />}
      </Group>
    </Stack>
  );
};
export default CatalogID;
