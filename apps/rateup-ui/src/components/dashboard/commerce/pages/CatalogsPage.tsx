import {
  ChevronRight,
  Ellipsis,
  LayoutGrid,
  Package,
  Plus,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  useDeletCatalogProducts,
  useSyncCatalogProducts,
  useWaCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import {
  useProductSetsByCatalog,
  useSyncProductSets,
} from "@/backend/whatsapp/catalog/productSet.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCatalogProductModal } from "@/components/whatsapp/catalog/products/AddCatalogProduct";
import { useConfirm } from "@/context/confirm-provider";
import { cn } from "@/lib/utils";
import { fallbackImage } from "@/utils/constants";

import CatalogSettingsTab from "../CatalogSettingsTab";
import { useCommerce } from "../CommerceContext";
import { CommerceShell } from "../CommerceShell";

const TILE_CLASSES = [
  "bg-amber-500/10 text-amber-600",
  "bg-primary/10 text-primary",
  "bg-destructive/10 text-destructive",
  "bg-sky-500/10 text-sky-600",
];

function stockMeta(props: any) {
  const out = /out\s*of\s*stock/i.test(props?.availability ?? "");
  return out
    ? {
        label: "Out of stock",
        cls: "bg-destructive/10 text-destructive",
        stockText: "Out of stock",
        stockCls: "text-destructive",
      }
    : {
        label: "Active",
        cls: "bg-emerald-500/10 text-emerald-600",
        stockText: "In stock",
        stockCls: "text-muted-foreground",
      };
}

/** Flatten a catalog product into the shape AddCatalogProduct's form expects. */
function toFormValues(product: any) {
  const { currency, price, base_price, sale_price, image, image_link, url, ...rest } =
    product.productProps ?? {};
  const num = (v: any) => (v ? parseFloat(String(v).replace(/[^0-9.-]+/g, "")) : undefined);

  return {
    ...product,
    currencyCode: currency,
    ...(price ? { price: num(price) } : {}),
    ...(base_price ? { base_price: num(base_price) } : {}),
    ...(sale_price ? { sale_price: num(sale_price) } : {}),
    ...(image?.length || image_link ? { image: image ?? [{ url: image_link, tag: [] }] } : {}),
    link: url,
    ...rest,
  };
}

export function CatalogsPage() {
  const { catalogId, isCatalogConnected, currencySymbol: sym } = useCommerce();
  const confirm = useConfirm();

  const { data: catalogData } = useWaCatalog(catalogId);
  const { data: products, isPending: loadingProducts } = useWaCatalogProducts(catalogId);
  const { data: productSets } = useProductSetsByCatalog(catalogId);

  const syncProducts = useSyncCatalogProducts(catalogId);
  const syncSets = useSyncProductSets();
  const deleteProducts = useDeletCatalogProducts(catalogId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);

  const productList: any[] = products ?? [];
  const collectionList: any[] = productSets ?? [];
  const vertical = catalogData?.vertical;

  const handleSync = () => {
    if (!catalogId) return;
    toast.promise(syncProducts.mutateAsync({}), {
      loading: "Syncing with Meta…",
      success: "Products synced",
      error: "Sync failed",
    });
  };

  const openCreate = () => {
    setEditProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product: any) => {
    setEditProduct(toFormValues(product));
    setModalOpen(true);
  };

  const handleDelete = async (product: any) => {
    const title = product.productProps?.title ?? product.productProps?.name ?? "this product";
    const ok = await confirm({
      title: "Delete product",
      description: `Are you sure you want to delete "${title}"?`,
      warning: "This removes the product from your Meta catalog and cannot be undone.",
      confirmText: "Delete",
    });
    if (!ok) return;

    let productIds: { id: string; hotel_reatiler_id?: string }[] = [];
    if (vertical === "commerce") {
      productIds = [{ id: product.retailer_id }];
    } else if (vertical === "hotels") {
      productIds = [{ id: product.hotel_id }];
    } else if (vertical === "hotel_room") {
      productIds = [{ id: product.hotel_room_id, hotel_reatiler_id: product.hotel_retailer_id }];
    }

    toast.loading("Deleting product…", { id: "cx-delete-product" });
    deleteProducts.mutate(
      { productIds },
      {
        onSuccess: () => toast.success("Product deleted", { id: "cx-delete-product" }),
        onError: (e: any) =>
          toast.error(e?.message || "Deletion failed", { id: "cx-delete-product" }),
      },
    );
  };

  return (
    <CommerceShell
      title="Catalogs"
      description="Manage products and collections synced to WhatsApp & Instagram."
      showCatalogSwitcher
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={!catalogId || syncProducts.isPending}
          >
            {syncProducts.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" className="text-emerald-600" />
            )}
            Sync with Meta
          </Button>
          <Button size="sm" onClick={openCreate} disabled={!catalogId}>
            <Plus data-icon="inline-start" />
            Add Product
          </Button>
        </>
      }
    >
      {!isCatalogConnected ? (
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBag />
            </EmptyMedia>
            <EmptyTitle>No catalog connected</EmptyTitle>
            <EmptyDescription>
              Connect a WhatsApp catalog to this store to manage products and collections.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Tabs defaultValue="products" className="flex flex-col gap-5">
          <TabsList>
            <TabsTrigger value="products">
              <ShoppingBag data-icon="inline-start" />
              Products · {productList.length}
            </TabsTrigger>
            <TabsTrigger value="collections">
              <LayoutGrid data-icon="inline-start" />
              Collections · {collectionList.length}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 data-icon="inline-start" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-0">
            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-xl" />
                ))}
              </div>
            ) : productList.length === 0 ? (
              <Empty className="rounded-xl border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>No products yet</EmptyTitle>
                  <EmptyDescription>
                    Add one or sync from Meta to populate this catalog.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : vertical !== "commerce" ? (
              <Empty className="rounded-xl border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>Unsupported catalog type</EmptyTitle>
                  <EmptyDescription>{vertical} items are not supported yet.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {productList.map((p, i) => {
                  const props = p.productProps ?? {};
                  const title = props.title ?? props.name ?? "Untitled product";
                  const image = props.image_link || props.image?.[0]?.url;
                  const price = props.sale_price || props.price;
                  const hasSale = props.sale_price && props.sale_price !== props.price;
                  const cat = props.brand ?? "Product";
                  const sm = stockMeta(props);
                  const tile = TILE_CLASSES[i % TILE_CLASSES.length];

                  return (
                    <Card
                      key={p.id ?? p.retailer_id ?? i}
                      className="group flex flex-col gap-0 overflow-hidden py-0"
                    >
                      <div
                        className={cn(
                          "relative flex h-[132px] items-center justify-center overflow-hidden",
                          image ? "bg-muted" : tile,
                        )}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = fallbackImage;
                            }}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Package className="size-11" />
                        )}

                        <Badge
                          variant="secondary"
                          className="absolute left-2.5 top-2.5 bg-background/85"
                        >
                          {cat}
                        </Badge>
                        <Badge className={cn("absolute right-2.5 top-2.5", sm.cls)}>
                          {sm.label}
                        </Badge>
                      </div>

                      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                        <div className="line-clamp-2 text-sm font-semibold text-foreground">
                          {title}
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-foreground">
                              {price ? `${sym}${price}` : "—"}
                            </span>
                            {hasSale && (
                              <span className="text-xs text-muted-foreground line-through">
                                {props.price}
                              </span>
                            )}
                          </span>
                          <span className={cn("text-xs", sm.stockCls)}>{sm.stockText}</span>
                        </div>

                        {/* Actions */}
                        <div className="mt-2.5 flex items-center gap-2 border-t pt-2.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="secondary"
                                  size="icon-sm"
                                  aria-label="More actions"
                                />
                              }
                            >
                              <Ellipsis />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleDelete(p)}
                                  disabled={deleteProducts.isPending}
                                >
                                  <Trash2 />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="collections" className="mt-0">
            <div className="mb-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => catalogId && syncSets.mutate(catalogId)}
                disabled={!catalogId || syncSets.isPending}
              >
                {syncSets.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                Sync collections
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collectionList.map((c, i) => {
                const tile = TILE_CLASSES[i % TILE_CLASSES.length];
                return (
                  <Card
                    key={c.id ?? c.productSetId ?? i}
                    className="flex-row items-center gap-3.5 p-4.5"
                  >
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-xl",
                        tile,
                      )}
                    >
                      <LayoutGrid className="size-[22px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {c.name ?? "Collection"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.productIds?.length ?? 0} products
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Card>
                );
              })}
              <div className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed p-4.5 text-sm font-semibold text-muted-foreground">
                <Plus className="size-4" />
                New collection
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <CatalogSettingsTab catalogData={catalogData} />
          </TabsContent>
        </Tabs>
      )}

      <AddCatalogProductModal
        catalogData={catalogData}
        opened={modalOpen}
        close={() => {
          setModalOpen(false);
          setEditProduct(null);
        }}
        productData={editProduct}
      />
    </CommerceShell>
  );
}
