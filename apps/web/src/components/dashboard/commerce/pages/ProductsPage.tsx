import { Alert, AlertAction, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Card } from "@rateup/ui/components/card";
import { Checkbox } from "@rateup/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rateup/ui/components/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rateup/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCategory,
  IconCloudUpload,
  IconCopy,
  IconDots,
  IconDownload,
  IconPackage,
  IconPencil,
  IconPencilDollar,
  IconPhotoOff,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  bulkSetProductStatus,
  createShopCollection,
  deleteShopCollection,
  exportShopProductsCsv,
  getShopProduct,
  republishShop,
  updateShopCollection,
  updateShopProduct,
  type ShopCollection,
  type ShopProduct,
  type ShopProductQuery,
  type ShopProductStatus,
} from "@/backend/commerce/shop.api";
import {
  useInvalidateShop,
  useShopCollections,
  useShopProductsWhileSyncing,
  useShopStore,
} from "@/backend/commerce/shop.query";
import { ListPageSearchInput } from "@/components/common/list-page-layout.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { usePermissions } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { StoreDisconnectedAlert } from "../settings/StoreCheckoutNotice.tsx";
import { BulkEditDialog } from "../shop/BulkEditDialog.tsx";
import { ImportProductsDialog } from "../shop/ImportProductsDialog.tsx";
import { hasPhoto, productFormValues, productPayload } from "../shop/productForm.ts";
import { SendToMeDialog } from "../shop/SendToMeDialog.tsx";
import { priceRange, productStatusBadge, SHOP_PATHS, totalStock } from "../shop/shopMeta.ts";
import {
  ChannelChip,
  downloadText,
  ProductThumb,
  SettingsTabLink,
  ShopPage,
  SyncDot,
  syncLabel,
  ToneBadge,
} from "../shop/ShopUi.tsx";
import { useDuplicateProduct } from "../shop/useDuplicateProduct.ts";

const TABS = ["all", "active", "drafts", "low_stock", "sold_out", "sync_errors"] as const;
type ProductTab = (typeof TABS)[number];
const isProductTab = (value: unknown): value is ProductTab => TABS.some((tab) => tab === value);

const PAGE_SIZE = 25;
const ALL = "all";

/** A product that should be in the Meta catalog but is not. */
const needsPublish = (p: ShopProduct) =>
  p.status === "ACTIVE" &&
  (p.showOnWhatsapp || p.showOnInstagram || p.showOnFacebook) &&
  (p.metaSyncStatus === "REJECTED" || p.metaSyncStatus === "NOT_SYNCED");

function tabQuery(tab: ProductTab): Pick<ShopProductQuery, "status" | "filter"> {
  switch (tab) {
    case "all":
      return {};
    case "active":
      return { status: "ACTIVE" };
    case "drafts":
      return { status: "DRAFT" };
    default:
      return { filter: tab };
  }
}

export function ProductsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can("commerce.products.manage");
  const canSell = can("commerce.sell");
  const { data: store } = useShopStore();
  const currency = store?.currency ?? "USD";

  const [tab, setTab] = useState<ProductTab>("all");
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState(ALL);
  const [channel, setChannel] = useState(ALL);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [sendToMe, setSendToMe] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const query: ShopProductQuery = {
    ...tabQuery(tab),
    search: debouncedSearch || undefined,
    collectionId: collectionId === ALL ? undefined : collectionId,
    channel:
      channel === "whatsapp" || channel === "instagram" || channel === "storefront"
        ? channel
        : undefined,
    page,
    limit: PAGE_SIZE,
  };
  const { data, isPending, isError, error, refetch } = useShopProductsWhileSyncing(query);
  const { data: collections = [] } = useShopCollections();
  const invalidate = useInvalidateShop();

  const resetPaging = () => {
    setPage(0);
    setSelected(new Set());
  };

  const bulk = useMutation({
    mutationFn: (status: ShopProductStatus) => bulkSetProductStatus([...selected], status),
    onSuccess: () => {
      toast.success(t("Products updated"));
      setSelected(new Set());
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not update the products"))),
  });

  const publishAll = useMutation({
    mutationFn: republishShop,
    onSuccess: ({ republished }) => {
      toast.success(
        t(
          "{count, plural, one {Publishing # product again} other {Publishing # products again}}. This usually takes under a minute.",
          { count: republished },
        ),
      );
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not publish the products"))),
  });

  const counts = data?.counts ?? {};
  const activeCount = counts.ACTIVE ?? 0;
  const draftCount = counts.DRAFT ?? 0;
  const tabLabels: Record<ProductTab, string> = {
    all: t("All"),
    active: t("Active"),
    drafts: t("Drafts"),
    low_stock: t("Low stock"),
    sold_out: t("Sold out"),
    sync_errors: t("Sync errors"),
  };
  const tabCounts: Partial<Record<ProductTab, number>> = {
    all: activeCount + draftCount,
    active: activeCount,
    drafts: draftCount,
  };

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((p) => selected.has(p.id));
  const filtering =
    Boolean(debouncedSearch) || collectionId !== ALL || channel !== ALL || tab !== "all";
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const unpublished = items.filter(needsPublish);
  const catalogConnected = Boolean(store?.metaCatalogId);

  return (
    <ShopPage
      title={t("Products")}
      description={t(
        "RateUp is your product source. Changes reach your WhatsApp catalog and Instagram shop within a minute.",
      )}
      actions={
        canEdit ? (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <IconUpload data-icon="inline-start" />
              {t("Import")}
            </Button>
            <ExportButton />
            <Button variant="outline" onClick={() => setCollectionsOpen(true)}>
              <IconCategory data-icon="inline-start" />
              {t("Collections")}
            </Button>
            <Button render={<Link to={SHOP_PATHS.newProduct} />}>
              <IconPlus data-icon="inline-start" />
              {t("Add product")}
            </Button>
          </>
        ) : (
          <ExportButton />
        )
      }
    >
      {store && <StoreDisconnectedAlert store={store} />}
      {store?.mode === "NATIVE" && canEdit && (store.connectedStores?.length ?? 0) > 0 && (
        <Alert>
          <IconUpload />
          <AlertTitle>
            {t("Sell your {store} products here", {
              store: store.connectedStores?.[0] === "shopify" ? "Shopify" : "WooCommerce",
            })}
          </AlertTitle>
          <AlertDescription>
            {t(
              "Import them with “Keep in sync” on and they stay up to date from your store, or copy them in once to edit them here.",
            )}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              {t("Import products")}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {(store?.ownProductsHidden ?? 0) > 0 && (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>
            {t(
              "{count, plural, one {# product isn't for sale} other {# products aren't for sale}} while customers pay on your store's checkout",
              { count: store?.ownProductsHidden ?? 0 },
            )}
          </AlertTitle>
          <AlertDescription>
            {t(
              "Products added in RateUp can't be paid for on your Shopify or WooCommerce checkout, so they're hidden from the storefront, chat and the AI agent. Add them to your store instead.",
            )}
          </AlertDescription>
        </Alert>
      )}
      {unpublished.length > 0 && (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>
            {t(
              "{count, plural, one {# product isn't on WhatsApp yet} other {# products aren't on WhatsApp yet}}",
              { count: unpublished.length },
            )}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            {catalogConnected ? (
              <span>
                {t(
                  "Meta rejected them or they were never published. Fix what the row says, then publish again.",
                )}
              </span>
            ) : (
              <span>
                {t("Connect your Meta catalog in")}{" "}
                <SettingsTabLink tab="store">{t("Commerce → Settings → Store")}</SettingsTabLink>
                {t(", and your products publish to it.")}
              </span>
            )}
            {canEdit && catalogConnected && (
              <Button
                size="sm"
                variant="outline"
                loading={publishAll.isPending}
                onClick={() => publishAll.mutate()}
              >
                <IconCloudUpload data-icon="inline-start" />
                {t("Publish all again")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      <Card className="gap-0 py-0">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isProductTab(value)) {
              setTab(value);
              resetPaging();
            }
          }}
          className="border-b border-border px-4 pt-2"
        >
          <TabsList variant="line" className="flex-wrap">
            {TABS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {tabLabels[key]}
                {tabCounts[key] !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {tabCounts[key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <ListPageSearchInput
            className="min-w-56 flex-1"
            value={search}
            placeholder={t("Search by name or SKU")}
            onChange={(value) => {
              setSearch(value);
              resetPaging();
            }}
          />
          <Select
            value={collectionId}
            onValueChange={(value) => {
              setCollectionId(value ?? ALL);
              resetPaging();
            }}
            items={[
              { value: ALL, label: t("All collections") },
              ...collections.map((c) => ({ value: c.id, label: c.name })),
            ]}
          >
            <SelectTrigger className="w-48" aria-label={t("Collection")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("All collections")}</SelectItem>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={channel}
            onValueChange={(value) => {
              setChannel(value ?? ALL);
              resetPaging();
            }}
            items={[
              { value: ALL, label: t("All channels") },
              { value: "whatsapp", label: t("WhatsApp") },
              { value: "instagram", label: t("Instagram") },
              { value: "storefront", label: t("Storefront") },
            ]}
          >
            <SelectTrigger className="w-40" aria-label={t("Channel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("All channels")}</SelectItem>
              <SelectItem value="whatsapp">{t("WhatsApp")}</SelectItem>
              <SelectItem value="instagram">{t("Instagram")}</SelectItem>
              <SelectItem value="storefront">{t("Storefront")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canEdit && selected.size > 0 && (
          <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-sm font-semibold text-foreground">
              {t("{count, plural, one {# product selected} other {# products selected}}", {
                count: selected.size,
              })}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setBulkEditOpen(true)}>
                <IconPencilDollar data-icon="inline-start" />
                {t("Edit prices and stock")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={bulk.isPending}
                onClick={() => bulk.mutate("ACTIVE")}
              >
                {t("Set active")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={bulk.isPending}
                onClick={() => bulk.mutate("DRAFT")}
              >
                {t("Set as draft")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                loading={bulk.isPending}
                onClick={() => bulk.mutate("ARCHIVED")}
              >
                {t("Archive")}
              </Button>
            </div>
          </div>
        )}

        {isPending ? (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("Could not load products")}</EmptyTitle>
              <EmptyDescription>
                {getApiErrorMessage(error, t("Please try again."))}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => void refetch()}>
                {t("Retry")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : items.length === 0 ? (
          filtering ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("No products match")}</EmptyTitle>
                <EmptyDescription>{t("Try another search or filter.")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconPackage />
                </EmptyMedia>
                <EmptyTitle>{t("Add your first product")}</EmptyTitle>
                <EmptyDescription>
                  {t(
                    "Products you add here publish to your WhatsApp catalog, your Instagram shop and your storefront, so customers can browse and buy in the chat.",
                  )}
                </EmptyDescription>
              </EmptyHeader>
              {canEdit && (
                <EmptyContent className="flex-row flex-wrap justify-center">
                  <Button render={<Link to={SHOP_PATHS.newProduct} />}>
                    <IconPlus data-icon="inline-start" />
                    {t("Add product")}
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <IconUpload data-icon="inline-start" />
                    {t("Import products")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && (
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      aria-label={t("Select all")}
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? new Set(items.map((p) => p.id)) : new Set())
                      }
                    />
                  </TableHead>
                )}
                <TableHead className={canEdit ? undefined : "pl-4"}>{t("Product")}</TableHead>
                <TableHead>{t("SKU")}</TableHead>
                <TableHead>{t("Price")}</TableHead>
                <TableHead>{t("Stock")}</TableHead>
                <TableHead>{t("Sold (30d)")}</TableHead>
                <TableHead>{t("Showing on")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="w-10 pr-4">
                  <span className="sr-only">{t("Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => {
                const stock = totalStock(p);
                const status = productStatusBadge(t, p.status);
                const skus = p.variants.map((v) => v.sku).filter(Boolean);
                return (
                  <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                    {canEdit && (
                      <TableCell className="pl-4">
                        <Checkbox
                          aria-label={t("Select {name}", { name: p.title })}
                          checked={selected.has(p.id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(p.id);
                              else next.delete(p.id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell className={canEdit ? undefined : "pl-4"}>
                      <Link
                        to={SHOP_PATHS.product}
                        params={{ productId: p.id }}
                        className="flex items-center gap-3 text-foreground hover:text-primary"
                      >
                        <ProductThumb src={p.images[0]} name={p.title} />
                        <span className="flex min-w-0 flex-col">
                          <span className="max-w-64 truncate font-semibold">{p.title}</span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {t("{count, plural, one {# variant} other {# variants}}", {
                              count: p.variants.length,
                            })}
                            {!hasPhoto(p) && (
                              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-500">
                                <IconPhotoOff className="size-3.5" aria-hidden />
                                {t("No photo")}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {skus.length === 0
                        ? "—"
                        : skus.length === 1
                          ? skus[0]
                          : t("{first} +{more}", { first: skus[0], more: skus.length - 1 })}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {priceRange(p, currency)}
                    </TableCell>
                    <TableCell>
                      {!stock.tracked ? (
                        <span className="text-muted-foreground">{t("Not tracked")}</span>
                      ) : stock.stock === 0 ? (
                        <ToneBadge tone="err">{t("Sold out")}</ToneBadge>
                      ) : stock.low ? (
                        <ToneBadge tone="warn">
                          {t("{count} left", { count: stock.stock })}
                        </ToneBadge>
                      ) : (
                        <span className="tabular-nums">{stock.stock}</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{p.sold30d ?? 0}</TableCell>
                    <TableCell>
                      <span className="inline-flex gap-1">
                        <ChannelChip
                          label={t("WA")}
                          on={p.showOnWhatsapp}
                          status={p.metaSyncStatus}
                          error={p.metaSyncError}
                        />
                        <ChannelChip
                          label={t("IG")}
                          on={p.showOnInstagram}
                          status={p.metaSyncStatus}
                          error={p.metaSyncError}
                        />
                        <ChannelChip
                          label={t("Store")}
                          on={p.showOnStorefront && p.status === "ACTIVE"}
                          status="LIVE"
                        />
                      </span>
                    </TableCell>
                    <TableCell>
                      <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                    </TableCell>
                    <TableCell className="pr-4">
                      <ProductRowMenu
                        product={p}
                        canEdit={canEdit}
                        canSell={canSell}
                        onSendToMe={() => setSendToMe(p.id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
          <span>{t("Showing {from}–{to} of {total}", { from, to, total })}</span>
          <span className="flex flex-wrap items-center gap-3">
            <SyncLegend />
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("Previous")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={to >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Next")}
            </Button>
          </span>
        </div>
      </Card>

      <CollectionsDialog
        open={collectionsOpen}
        onOpenChange={setCollectionsOpen}
        collections={collections}
      />
      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        products={items.filter((p) => selected.has(p.id))}
        currency={currency}
        onDone={() => setSelected(new Set())}
      />
      <SendToMeDialog
        productId={sendToMe ?? ""}
        open={sendToMe !== null}
        onOpenChange={(open) => !open && setSendToMe(null)}
      />
    </ShopPage>
  );
}

function ProductRowMenu({
  product,
  canEdit,
  canSell,
  onSendToMe,
}: Readonly<{
  product: ShopProduct;
  canEdit: boolean;
  canSell: boolean;
  onSendToMe: () => void;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const invalidate = useInvalidateShop();
  const duplicate = useDuplicateProduct();
  // The list row is a summary, so re-save the full product rather than what the list holds.
  const publish = useMutation({
    mutationFn: async () => {
      const full = await getShopProduct(product.id);
      return updateShopProduct(full.id, productPayload(productFormValues(full)));
    },
    onSuccess: () => {
      toast.success(t("Publishing again. This usually takes under a minute."));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not publish the product"))),
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("Actions for {name}", { name: product.title })}
          />
        }
      >
        <IconDots />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          render={<Link to={SHOP_PATHS.product} params={{ productId: product.id }} />}
        >
          <IconPencil />
          {canEdit ? t("Edit") : t("View")}
        </DropdownMenuItem>
        {canEdit && !product.externalSource && (
          <DropdownMenuItem
            disabled={duplicate.isPending}
            onClick={() =>
              duplicate.mutate(product.id, {
                onSuccess: (copy) =>
                  void navigate({ to: SHOP_PATHS.product, params: { productId: copy.id } }),
              })
            }
          >
            <IconCopy />
            {t("Duplicate")}
          </DropdownMenuItem>
        )}
        {canSell && (
          <DropdownMenuItem onClick={onSendToMe}>
            <IconBrandWhatsapp />
            {t("Send to my WhatsApp")}
          </DropdownMenuItem>
        )}
        {canEdit && needsPublish(product) && (
          <DropdownMenuItem disabled={publish.isPending} onClick={() => publish.mutate()}>
            <IconCloudUpload />
            {t("Publish again")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const LEGEND = ["LIVE", "SYNCING", "NOT_SYNCED", "REJECTED", "HIDDEN"] as const;

function SyncLegend() {
  const { t } = useTranslation();
  return (
    <span className="hidden flex-wrap items-center gap-3 md:inline-flex">
      {LEGEND.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <SyncDot status={status} />
          {syncLabel(t, status)}
        </span>
      ))}
    </span>
  );
}

function ExportButton() {
  const { t } = useTranslation();
  const exportCsv = useMutation({
    mutationFn: exportShopProductsCsv,
    onSuccess: (csv) => downloadText(String(csv), "products.csv"),
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not export products"))),
  });
  return (
    <Button variant="outline" loading={exportCsv.isPending} onClick={() => exportCsv.mutate()}>
      <IconDownload data-icon="inline-start" />
      {t("Export CSV")}
    </Button>
  );
}

function CollectionsDialog({
  open,
  onOpenChange,
  collections,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: ShopCollection[];
}>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const onError = (e: unknown) =>
    toast.error(getApiErrorMessage(e, t("Could not save the collection")));
  const create = useMutation({
    mutationFn: () => createShopCollection({ name: name.trim() }),
    onSuccess: () => {
      setName("");
      void invalidate();
    },
    onError,
  });
  const rename = useMutation({
    mutationFn: (c: { id: string; name: string }) =>
      updateShopCollection(c.id, { name: c.name.trim() }),
    onSuccess: () => {
      setEditing(null);
      void invalidate();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: deleteShopCollection,
    onSuccess: () => void invalidate(),
    onError,
  });

  const onDelete = async (c: ShopCollection) => {
    const ok = await confirm({
      title: t("Delete {name}?", { name: c.name }),
      description: t("Products stay in your catalog; they just leave this collection."),
      confirmText: t("Delete"),
    });
    if (ok) remove.mutate(c.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Collections")}</DialogTitle>
          <DialogDescription>
            {t("Group products for your storefront and for coupons that apply to a collection.")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("New collection name")}
            aria-label={t("New collection name")}
            maxLength={60}
          />
          <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
            {t("Add")}
          </Button>
        </form>
        <ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain">
          {collections.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">{t("No collections yet.")}</li>
          )}
          {collections.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 border-b border-border py-2 last:border-b-0"
            >
              {editing?.id === c.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editing.name.trim()) rename.mutate(editing);
                  }}
                >
                  <Input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                    aria-label={t("Collection name")}
                    maxLength={60}
                  />
                  <Button type="submit" size="sm" loading={rename.isPending}>
                    {t("Save")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    {t("Cancel")}
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("{count, plural, one {# product} other {# products}}", {
                      count: c._count?.products ?? 0,
                    })}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("Rename {name}", { name: c.name })}
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                  >
                    <IconPencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("Delete {name}", { name: c.name })}
                    onClick={() => void onDelete(c)}
                  >
                    <IconTrash />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
