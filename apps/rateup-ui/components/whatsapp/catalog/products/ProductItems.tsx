"use client";

import React, { useState } from "react";

import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconShoppingBag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  useDeletCatalogProducts,
  useWaCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import { Button } from "@/components/ui/button";
import { fallbackImage } from "@/utils/constants";

import { AddCatalogProductModal } from "./AddCatalogProduct";

const ProductItems = ({ catalogId }) => {
  const deleteProducts = useDeletCatalogProducts(catalogId);
  const { data: catalog, isPending } = useWaCatalog(catalogId);
  const { data: products, isLoading } = useWaCatalogProducts(catalogId);
  const [opened, setOpened] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    setOpened(true);
  }
  const { vertical } = catalog;
  function handleDelete(product) {
    toast.loading("Hold on...deleting..", {
      id: "delete-catalog-product",
    });

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
          toast.success("product deleted", {
            id: "delete-catalog-product",
          });
        },
        onError: (error) => {
          toast.error(error?.message || "product deletion failed", {
            id: "delete-catalog-product",
          });
        },
      },
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const { productProps } = product;
        const itemId = product.id ?? product.retailer_id;
        const isExpanded = expandedItems[itemId];

        return (
          <div
            key={itemId}
            className="rounded-lg border shadow-sm bg-white overflow-hidden flex flex-col"
          >
            {vertical == "commerce" ? (
              <>
                <div className="border-b px-3 py-2 flex justify-end gap-2 bg-gray-50/50">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-gray-200"
                    onClick={() => handleOpenEdit(product)}
                  >
                    <IconEdit size={16} className="text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-red-100"
                    onClick={() => handleDelete(product)}
                    disabled={deleteProducts.isPending}
                  >
                    <IconTrash size={16} className="text-red-500" />
                  </Button>
                </div>

                <div className="w-full h-[200px] border-b flex justify-center items-center overflow-hidden bg-gray-100 relative">
                  {product.shopifyVariantId && (
                    <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#96bf48] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
                      <IconShoppingBag size={11} />
                      Shopify
                    </span>
                  )}
                  <img
                    alt={productProps.title ?? productProps.name}
                    src={
                      productProps.image_link ||
                      productProps.image?.[0]?.url ||
                      fallbackImage
                    }
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <div
                    className={`relative ${!isExpanded ? "max-h-[100px] overflow-hidden" : ""}`}
                  >
                    <h4
                      className="font-semibold truncate"
                      title={productProps.title ?? productProps.name}
                    >
                      {productProps.title ?? productProps.name}
                    </h4>
                    <p
                      className="text-gray-500 text-sm truncate"
                      title={productProps.description}
                    >
                      {productProps.description}
                    </p>
                    <p className="text-lg font-medium mt-1">
                      {productProps.sale_price ?? productProps.price}
                    </p>
                    {productProps.sale_price &&
                      productProps.sale_price !== productProps.price && (
                        <p className="text-sm line-through text-gray-400">
                          M.R.P.: {productProps.price}
                        </p>
                      )}

                    <div className="flex flex-col gap-1 mt-3">
                      {extraProps.map((pp) => (
                        <div
                          className="flex justify-between items-center"
                          key={pp.key}
                        >
                          <span className="text-sm font-medium">
                            {pp.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {productProps[pp.key]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {productProps.url && (
                      <div className="mt-3">
                        <span className="font-medium text-sm block">
                          Website Link
                        </span>
                        <a
                          href={productProps.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-500 hover:underline truncate block"
                        >
                          {productProps.url}
                        </a>
                      </div>
                    )}

                    {!isExpanded && (
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent" />
                    )}
                  </div>

                  <button
                    onClick={() => toggleExpand(itemId)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 self-start mt-1 font-medium"
                  >
                    {isExpanded ? (
                      <>
                        See less <IconChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        See more <IconChevronDown size={14} />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <p className="p-4 text-gray-500">
                {vertical} item not supported yet.
              </p>
            )}
          </div>
        );
      })}
      <AddCatalogProductModal
        catalogData={{ catalogId, vertical }}
        opened={opened}
        close={() => setOpened(false)}
        productData={selectedProduct}
      />
    </div>
  );
};

export default ProductItems;
