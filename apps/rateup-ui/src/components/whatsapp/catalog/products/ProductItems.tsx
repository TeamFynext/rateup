import { IconEdit, IconExternalLink, IconShoppingBag, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  useDeletCatalogProducts,
  useWaCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { fallbackImage } from "@/utils/constants.ts";

import { AddCatalogProductModal } from "./AddCatalogProduct.tsx";

const extraProps = [
  { key: "brand", label: "Brand" },
  { key: "color", label: "Color" },
  { key: "size", label: "Size" },
  { key: "pattern", label: "Pattern" },
  { key: "gender", label: "Gender" },
  { key: "age_group", label: "Age Group" },
];

/** A catalog product row as the product table renders it. */
interface CatalogProductRow {
  id: string;
  retailer_id?: string;
  [key: string]: unknown;
}

const ProductItems = ({ catalogId }: { catalogId: string }) => {
  const deleteProducts = useDeletCatalogProducts(catalogId);
  const { data: catalog, isPending } = useWaCatalog(catalogId);
  const { data: products, isLoading } = useWaCatalogProducts(catalogId);
  const [opened, setOpened] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (isLoading || isPending) return <RateupLoader />;
  if (!products || !products.length) {
    return <NothingFound text="No products found" />;
  }

  function handleOpenEdit(product: CatalogProductRow) {
    const { currency, price, base_price, sale_price, image, image_link, url, ...rest } =
      product.productProps;
    const formattedProduct = {
      currencyCode: currency,
      ...(price ? { price: parseFloat(price.replace(/[^0-9.-]+/g, "")) } : {}),
      ...(base_price ? { base_price: parseFloat(base_price.replace(/[^0-9.-]+/g, "")) } : {}),
      ...(sale_price ? { sale_price: parseFloat(sale_price.replace(/[^0-9.-]+/g, "")) } : {}),
      ...(image?.length || image_link.length
        ? { image: image ?? [{ url: image_link, tag: [] }] }
        : {}),
      link: url,
      ...rest,
    };
    setSelectedProduct({ ...product, ...formattedProduct });
    setOpened(true);
  }

  const { vertical } = catalog;

  function handleDelete(product: CatalogProductRow) {
    toast.loading("Deleting product…", { id: "delete-catalog-product" });
    let productIds: string[] = [];
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
        onSuccess: () => toast.success("Product deleted", { id: "delete-catalog-product" }),
        onError: (error) =>
          toast.error(error?.message || "Deletion failed", {
            id: "delete-catalog-product",
          }),
      },
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product: any) => {
          const { productProps } = product;
          const itemId = product.id ?? product.retailer_id;
          const hasSalePrice =
            productProps.sale_price && productProps.sale_price !== productProps.price;
          const filledAttrs = extraProps.filter((p) => productProps[p.key]);

          return (
            <Card key={itemId} className="group overflow-hidden flex flex-col p-0 gap-0">
              {vertical === "commerce" ? (
                <>
                  {/* Image */}
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {product.shopifyVariantId && (
                      <Badge className="absolute top-2 left-2 z-10 bg-[#96bf48] hover:bg-[#96bf48] gap-1">
                        <IconShoppingBag size={11} />
                        Shopify
                      </Badge>
                    )}
                    <img
                      alt={productProps.title ?? productProps.name}
                      src={productProps.image_link || productProps.image?.[0]?.url || fallbackImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImage;
                      }}
                      className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="secondary"
                              onClick={() => handleOpenEdit(product)}
                            />
                          }
                        >
                          <IconEdit size={15} />
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              onClick={() => handleDelete(product)}
                              disabled={deleteProducts.isPending}
                            />
                          }
                        >
                          <IconTrash size={15} />
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="p-3 flex flex-col gap-2 flex-1">
                    <div>
                      <p
                        className="font-semibold text-sm leading-tight line-clamp-2"
                        title={productProps.title ?? productProps.name}
                      >
                        {productProps.title ?? productProps.name}
                      </p>
                      {productProps.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {productProps.description}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-base">
                        {productProps.sale_price ?? productProps.price}
                      </span>
                      {hasSalePrice && (
                        <span className="text-xs line-through text-muted-foreground">
                          {productProps.price}
                        </span>
                      )}
                    </div>

                    {/* Attribute badges */}
                    {filledAttrs.length > 0 && (
                      <>
                        <Separator className="mt-auto" />
                        <div className="flex flex-wrap gap-1">
                          {filledAttrs.map((pp) => (
                            <Badge key={pp.key} variant="secondary" className="text-xs font-normal">
                              {pp.label}: {productProps[pp.key]}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Link */}
                    {productProps.url && (
                      <a
                        href={productProps.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-auto flex items-center gap-1 text-xs text-primary hover:underline truncate"
                      >
                        <IconExternalLink size={12} />
                        {productProps.url}
                      </a>
                    )}
                  </CardContent>
                </>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  {vertical} items are not supported yet.
                </p>
              )}
            </Card>
          );
        })}
      </div>
      <AddCatalogProductModal
        catalogData={{ catalogId, vertical }}
        opened={opened}
        close={() => setOpened(false)}
        productData={selectedProduct}
      />
    </>
  );
};

export default ProductItems;
