import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconArchive,
  IconCopy,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCloudUpload,
  IconHistory,
  IconListSearch,
  IconPhotoPlus,
  IconPlus,
  IconStar,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  archiveShopProduct,
  createShopProduct,
  formatMoney,
  setVariantStock,
  updateShopProduct,
  type ShopProduct,
} from "@/backend/commerce/shop.api";
import {
  useInvalidateShop,
  useShopCollections,
  useShopProductWhileSyncing,
  useShopStockHistory,
  useShopStore,
} from "@/backend/commerce/shop.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TagsInput } from "@/components/ui/tags-input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { resolveAssetUrl, uploadFile } from "@/utils/file-upload/upload.ts";

import {
  BLANK_PRODUCT,
  buildVariants,
  hasPhoto,
  PRODUCT_CATEGORIES,
  productFormSchema,
  productFormValues,
  productPayload,
  type ProductFormValues,
} from "../shop/productForm.ts";
import { SendToMeDialog } from "../shop/SendToMeDialog.tsx";
import { productStatusBadge, SHOP_PATHS } from "../shop/shopMeta.ts";
import {
  SettingRow,
  SettingsTabLink,
  ShopPage,
  ShopSection,
  SyncStatusChip,
  ToneBadge,
} from "../shop/ShopUi.tsx";
import { useDuplicateProduct } from "../shop/useDuplicateProduct.ts";

type Form = UseFormReturn<ProductFormValues>;

export function NewProductPage() {
  return <ProductEditor key="new" />;
}

export function EditProductPage({ productId }: Readonly<{ productId: string }>) {
  const { t } = useTranslation();
  const { data: product, isPending, isError, error } = useShopProductWhileSyncing(productId);
  if (isPending) {
    return (
      <ShopPage title={t("Product")} back={{ to: SHOP_PATHS.products, label: t("Products") }}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </ShopPage>
    );
  }
  if (isError) {
    return (
      <ShopPage title={t("Product")} back={{ to: SHOP_PATHS.products, label: t("Products") }}>
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("This product could not be loaded")}</EmptyTitle>
            <EmptyDescription>
              {getApiErrorMessage(error, t("It may have been removed."))}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ShopPage>
    );
  }
  return <ProductEditor key={editorKey(product)} product={product} />;
}

/**
 * Keyed on the saved content, so a save reloads the form from the server's copy while the
 * sync poll and stock changes (which also bump updatedAt) leave edits in progress alone.
 */
function editorKey(product: ShopProduct): string {
  const values = productFormValues(product);
  return JSON.stringify({
    ...values,
    variants: values.variants.map((v) => ({ ...v, currentStock: 0, waiting: 0 })),
  });
}

function ProductEditor({ product }: Readonly<{ product?: ShopProduct }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const { can } = usePermissions();
  const canEdit = can("commerce.products.manage");
  const canSell = can("commerce.sell");
  const canAutomate = can("automation.manage");
  const { data: store } = useShopStore();
  const currency = store?.currency ?? "USD";
  const mirrored = Boolean(product?.externalSource);
  const [sendToMeOpen, setSendToMeOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productFormValues(product) : BLANK_PRODUCT,
  });

  const save = useMutation({
    mutationFn: (values: ProductFormValues) =>
      product
        ? updateShopProduct(product.id, productPayload(values))
        : createShopProduct(productPayload(values)),
    onSuccess: (saved) => {
      toast.success(product ? t("Product saved") : t("Product added"));
      void invalidate();
      if (!product)
        void navigate({ to: SHOP_PATHS.product, params: { productId: saved.id }, replace: true });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save the product"))),
  });

  const duplicate = useDuplicateProduct();
  const archive = useMutation({
    mutationFn: () => archiveShopProduct(product?.id ?? ""),
    onSuccess: () => {
      toast.success(t("Product archived"));
      void invalidate();
      void navigate({ to: SHOP_PATHS.products });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not archive the product"))),
  });

  // Re-saves the server's copy, not the form: unsaved edits go out with Save instead.
  const publishAgain = useMutation({
    mutationFn: (current: ShopProduct) =>
      updateShopProduct(current.id, productPayload(productFormValues(current))),
    onSuccess: () => {
      toast.success(t("Publishing again. This usually takes under a minute."));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not publish the product"))),
  });

  const onArchive = async () => {
    const ok = await confirm({
      title: t("Archive this product?"),
      description: t(
        "It disappears from WhatsApp, Instagram and your storefront. Past orders keep it.",
      ),
      confirmText: t("Archive"),
    });
    if (ok) archive.mutate();
  };

  const title = useWatch({ control: form.control, name: "title" });
  const status = productStatusBadge(t, product?.status ?? "DRAFT");

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
      <ShopPage
        title={product ? title || product.title : t("New product")}
        back={{ to: SHOP_PATHS.products, label: t("Products") }}
        badges={product ? <ToneBadge tone={status.tone}>{status.label}</ToneBadge> : undefined}
        actions={
          canEdit || canSell ? (
            <>
              {product?.status === "ACTIVE" && canAutomate && (
                <Button
                  variant="outline"
                  render={
                    <Link
                      to="/dashboard/automation/rules/$ruleId"
                      params={{ ruleId: "new" }}
                      search={{ template: "comment-to-buy", product: product.id }}
                    />
                  }
                >
                  <IconBrandInstagram data-icon="inline-start" />
                  {t("Sell on Instagram")}
                </Button>
              )}
              {product && canSell && (
                <Button type="button" variant="outline" onClick={() => setSendToMeOpen(true)}>
                  <IconBrandWhatsapp data-icon="inline-start" />
                  {t("Send to my WhatsApp")}
                </Button>
              )}
              {canEdit && product && !mirrored && (
                <Button
                  type="button"
                  variant="outline"
                  loading={duplicate.isPending}
                  onClick={() =>
                    duplicate.mutate(product.id, {
                      onSuccess: (copy) =>
                        void navigate({ to: SHOP_PATHS.product, params: { productId: copy.id } }),
                    })
                  }
                >
                  <IconCopy data-icon="inline-start" />
                  {t("Duplicate")}
                </Button>
              )}
              {canEdit && product && product.status !== "ARCHIVED" && (
                <Button
                  type="button"
                  variant="ghost"
                  loading={archive.isPending}
                  onClick={() => void onArchive()}
                >
                  <IconArchive data-icon="inline-start" />
                  {t("Archive")}
                </Button>
              )}
              {canEdit && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!form.formState.isDirty}
                    onClick={() => form.reset()}
                  >
                    {t("Discard")}
                  </Button>
                  <Button type="submit" loading={save.isPending}>
                    {t("Save")}
                  </Button>
                </>
              )}
            </>
          ) : undefined
        }
      >
        {mirrored && (
          <Alert>
            <IconAlertTriangle />
            <AlertTitle>{t("This product comes from your connected store")}</AlertTitle>
            <AlertDescription>
              {t(
                "Edit its name, photos, prices, variants and stock in your store; they sync here. Where it sells and collections can be changed here.",
              )}
            </AlertDescription>
          </Alert>
        )}
        {!mirrored && store && store.checkoutVia !== "RATEUP" && (
          <Alert>
            <IconAlertTriangle />
            <AlertTitle>{t("Customers can't buy this product right now")}</AlertTitle>
            <AlertDescription>
              {t(
                "Customers pay on your {store} checkout, which only sells products from {store}. Add it there and it syncs here, or switch to RateUp checkout in Settings → Checkout.",
                { store: store.checkoutVia === "SHOPIFY" ? "Shopify" : "WooCommerce" },
              )}
            </AlertDescription>
          </Alert>
        )}
        {product?.metaSyncStatus === "REJECTED" && (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>{t("Meta rejected this product")}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                {product.metaSyncError ??
                  t("Check the photo, the description and the category, then publish again.")}
              </span>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={publishAgain.isPending}
                  onClick={() => publishAgain.mutate(product)}
                >
                  <IconCloudUpload data-icon="inline-start" />
                  {t("Publish again")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {product?.metaSyncStatus === "NOT_SYNCED" &&
          product.status === "ACTIVE" &&
          (product.showOnWhatsapp || product.showOnInstagram || product.showOnFacebook) && (
            <Alert>
              <IconAlertTriangle />
              <AlertTitle>{t("Not on WhatsApp yet — connect your Meta catalog")}</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                {store?.metaCatalogId ? (
                  <span>
                    {t(
                      "Your catalog is connected, but this product has not been published to it. Publish it again.",
                    )}
                  </span>
                ) : (
                  <span>
                    {t("Customers can't see it in WhatsApp or Instagram until you connect one in")}{" "}
                    <SettingsTabLink tab="store">
                      {t("Commerce → Settings → Store")}
                    </SettingsTabLink>
                    .
                  </span>
                )}
                {canEdit && store?.metaCatalogId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={publishAgain.isPending}
                    onClick={() => publishAgain.mutate(product)}
                  >
                    <IconCloudUpload data-icon="inline-start" />
                    {t("Publish again")}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

        <fieldset
          disabled={!canEdit}
          className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[2fr_1fr]"
        >
          <div className="flex min-w-0 flex-col gap-5">
            <fieldset disabled={mirrored} className="flex min-w-0 flex-col gap-5">
              <DetailsSection form={form} />
              <PhotosSection form={form} />
              <OptionsSection form={form} />
            </fieldset>
            <VariantsSection form={form} currency={currency} mirrored={mirrored} live={product} />
          </div>
          <aside className="flex min-w-0 flex-col gap-5">
            <StatusSection form={form} />
            <ChannelsSection form={form} product={product} />
            <CollectionsSection form={form} />
            <PreviewSection form={form} currency={currency} />
            <LoyaltySection form={form} />
          </aside>
        </fieldset>
      </ShopPage>
      {product && (
        <SendToMeDialog productId={product.id} open={sendToMeOpen} onOpenChange={setSendToMeOpen} />
      )}
    </form>
  );
}

function DetailsSection({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  const { errors } = form.formState;
  return (
    <ShopSection title={t("Details")}>
      <div className="flex flex-col gap-4">
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="product-title">{t("Name")}</FieldLabel>
          <Input
            id="product-title"
            {...form.register("title")}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <FieldError errors={[errors.title]} />}
        </Field>
        <Field>
          <FieldLabel htmlFor="product-description">{t("Description")}</FieldLabel>
          <Textarea id="product-description" rows={4} {...form.register("description")} />
          <span className="text-xs text-muted-foreground">
            {t("Shown in WhatsApp, Instagram and your storefront. Keep the first line short.")}
          </span>
        </Field>
        <CategoryField form={form} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="product-brand">{t("Brand")}</FieldLabel>
            <Input id="product-brand" {...form.register("brand")} />
          </Field>
          <Field data-invalid={Boolean(errors.productUrl)}>
            <FieldLabel htmlFor="product-url">{t("Product URL")}</FieldLabel>
            <Input
              id="product-url"
              type="url"
              placeholder="https://"
              {...form.register("productUrl")}
            />
            {errors.productUrl && <FieldError errors={[errors.productUrl]} />}
          </Field>
        </div>
      </div>
    </ShopSection>
  );
}

function CategoryField({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? PRODUCT_CATEGORIES.filter((c) => c.toLowerCase().includes(needle))
    : PRODUCT_CATEGORIES;
  return (
    <Field>
      <FieldLabel htmlFor="product-category">{t("Product category")}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id="product-category"
          placeholder={t("Home & Garden > Decor")}
          {...form.register("category")}
        />
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setQuery("");
          }}
        >
          <PopoverTrigger render={<Button type="button" variant="outline" />}>
            <IconListSearch data-icon="inline-start" />
            {t("Browse")}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <Input
              autoFocus
              aria-label={t("Search categories")}
              placeholder={t("Search categories")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="mt-2 flex max-h-64 flex-col overflow-y-auto overscroll-contain">
              {matches.length === 0 ? (
                <li className="px-2 py-1.5 text-sm text-muted-foreground">
                  {t("No match. You can type your own category instead.")}
                </li>
              ) : (
                matches.map((category) => (
                  <li key={category}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start py-1.5 text-left whitespace-normal"
                      onClick={() => {
                        form.setValue("category", category, { shouldDirty: true });
                        setOpen(false);
                      }}
                    >
                      {category}
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <span className="text-xs text-muted-foreground">
        {t(
          "Helps Meta show the product in the right place. Pick the closest match, or type your own.",
        )}
      </span>
    </Field>
  );
}

function PhotosSection({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [images, variants] = useWatch({ control: form.control, name: ["images", "variants"] });

  const setImages = (next: string[]) => form.setValue("images", next, { shouldDirty: true });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const room = 10 - images.length;
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        urls.push(resolveAssetUrl(await uploadFile(file)));
      }
      setImages([...images, ...urls]);
    } catch (e) {
      toast.error(typeof e === "string" ? e : t("Could not upload the photo"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ShopSection
      title={t("Photos")}
      description={t("The first photo is the one customers see in chat. Square, at least 500 px.")}
    >
      {!hasPhoto({ images, variants }) && (
        <Alert className="mb-3">
          <IconAlertTriangle />
          <AlertDescription>
            {t("WhatsApp and Instagram need a photo to show this product.")}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
        {images.map((url, i) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border"
          >
            <img src={url} alt="" className="size-full object-cover" />
            {i === 0 ? (
              <ToneBadge tone="info" className="absolute bottom-2 left-2 bg-background">
                {t("Cover")}
              </ToneBadge>
            ) : (
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                className="absolute bottom-2 left-2"
                aria-label={t("Use as cover")}
                onClick={() => setImages([url, ...images.filter((u) => u !== url)])}
              >
                <IconStar />
              </Button>
            )}
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              className="absolute top-2 right-2"
              aria-label={t("Remove photo")}
              onClick={() => setImages(images.filter((u) => u !== url))}
            >
              <IconX />
            </Button>
          </div>
        ))}
        {images.length < 10 && (
          <Button
            type="button"
            variant="outline"
            className="aspect-square h-auto flex-col border-dashed text-primary"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <IconPhotoPlus />
            {t("Add photo")}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </ShopSection>
  );
}

function OptionsSection({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  const options = useWatch({ control: form.control, name: "options" });

  const apply = (next: ProductFormValues["options"]) => {
    form.setValue("options", next, { shouldDirty: true });
    form.setValue("variants", buildVariants(next, form.getValues("variants")), {
      shouldDirty: true,
    });
  };

  return (
    <ShopSection
      title={t("Options")}
      description={t("Up to three, such as Size or Colour. Each combination becomes a variant.")}
      actions={
        options.length < 3 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => apply([...options, { name: "", values: [] }])}
          >
            <IconPlus data-icon="inline-start" />
            {t("Add option")}
          </Button>
        ) : undefined
      }
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("This product comes in one version.")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {options.map((option, i) => (
            <div
              key={i}
              className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[160px_1fr_auto]"
            >
              <Input
                aria-label={t("Option name")}
                placeholder={t("Size")}
                value={option.name}
                maxLength={30}
                onChange={(e) =>
                  apply(options.map((o, j) => (j === i ? { ...o, name: e.target.value } : o)))
                }
              />
              <TagsInput
                value={option.values}
                unique
                maxTags={30}
                placeholder={t("Type a value and press Enter")}
                onValueChange={(values) =>
                  apply(options.map((o, j) => (j === i ? { ...o, values } : o)))
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t("Remove option")}
                onClick={() => apply(options.filter((_, j) => j !== i))}
              >
                <IconTrash />
              </Button>
            </div>
          ))}
        </div>
      )}
    </ShopSection>
  );
}

function VariantsSection({
  form,
  currency,
  mirrored,
  live,
}: Readonly<{ form: Form; currency: string; mirrored: boolean; live?: ShopProduct }>) {
  const { t } = useTranslation();
  const variants = useWatch({ control: form.control, name: "variants" });
  // Stock and tracking as saved: the poll refreshes these without re-mounting the form.
  const saved = new Map((live?.variants ?? []).map((v) => [v.id, v]));
  const hasNew = variants.some((v) => !v.id);
  const waiting = variants.reduce((s, v) => s + v.waiting, 0);
  const errors = form.formState.errors.variants;
  const priceDisabled = mirrored;

  return (
    <ShopSection
      title={t("Variants & stock")}
      description={t("Prices in {currency}.", { currency })}
      flush
    >
      {waiting > 0 && (
        <div className="mx-6 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-500">
          {t(
            "{count, plural, one {# person asked} other {# people asked}} to be told when this is back in stock. They get a WhatsApp message as soon as you add stock.",
            { count: waiting },
          )}
        </div>
      )}
      <ul className="divide-y divide-border border-t border-border">
        {variants.map((v, i) => {
          const rowErrors = errors?.[i];
          const server = v.id ? saved.get(v.id) : undefined;
          const stock = server?.stock ?? v.currentStock;
          const counted = server?.trackInventory ?? false;
          const low = counted && v.lowStockAt !== "" && stock <= Number(v.lowStockAt);
          const stockField = form.register(`variants.${i}.stock`);
          return (
            <li key={v.id ?? v.title} className="flex flex-col gap-3 px-6 py-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {v.optionValues ? v.title : t("Default")}
                {counted &&
                  (stock <= 0 ? (
                    <ToneBadge tone="err">{t("Sold out")}</ToneBadge>
                  ) : low ? (
                    <ToneBadge tone="warn">{t("Low")}</ToneBadge>
                  ) : null)}
              </span>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <VariantField label={t("Price")}>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    disabled={priceDisabled}
                    aria-label={t("Price for {variant}", { variant: v.title })}
                    aria-invalid={Boolean(rowErrors?.price)}
                    {...form.register(`variants.${i}.price`)}
                  />
                </VariantField>
                <VariantField label={t("Original price (shown crossed out)")}>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    disabled={priceDisabled}
                    aria-label={t("Original price for {variant}", { variant: v.title })}
                    aria-invalid={Boolean(rowErrors?.compareAtPrice)}
                    {...form.register(`variants.${i}.compareAtPrice`)}
                  />
                </VariantField>
                <VariantField label={t("SKU")}>
                  <Input
                    className="w-32"
                    disabled={priceDisabled}
                    aria-label={t("SKU for {variant}", { variant: v.title })}
                    {...form.register(`variants.${i}.sku`)}
                  />
                </VariantField>
                <VariantField label={t("In stock")}>
                  {v.id && counted ? (
                    mirrored ? (
                      <span className="flex h-9 items-center text-sm">
                        {stock > 0 ? t("Available") : t("Sold out")}
                      </span>
                    ) : (
                      <StockControl variantId={v.id} stock={stock} title={v.title} />
                    )
                  ) : v.id ? (
                    <span className="flex h-9 items-center text-xs whitespace-nowrap text-muted-foreground">
                      {v.trackInventory ? t("Save to start counting") : t("Not counted")}
                    </span>
                  ) : (
                    <Input
                      className="w-20"
                      inputMode="numeric"
                      placeholder="—"
                      aria-label={t("Stock for {variant}", { variant: v.title })}
                      aria-invalid={Boolean(rowErrors?.stock)}
                      {...stockField}
                      onChange={(e) => {
                        void stockField.onChange(e);
                        form.setValue(
                          `variants.${i}.trackInventory`,
                          e.target.value.trim() !== "",
                          { shouldDirty: true },
                        );
                      }}
                    />
                  )}
                </VariantField>
                <VariantField label={t("Alert below")}>
                  <Input
                    className="w-20"
                    inputMode="numeric"
                    aria-label={t("Low-stock alert for {variant}", { variant: v.title })}
                    aria-invalid={Boolean(rowErrors?.lowStockAt)}
                    {...form.register(`variants.${i}.lowStockAt`)}
                  />
                </VariantField>
                <div className="flex h-9 items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Controller
                      control={form.control}
                      name={`variants.${i}.trackInventory`}
                      render={({ field }) => (
                        <Checkbox
                          aria-label={t("Track stock for {variant}", { variant: v.title })}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {t("Track")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Controller
                      control={form.control}
                      name={`variants.${i}.allowBackorder`}
                      render={({ field }) => (
                        <Checkbox
                          aria-label={t("Keep selling {variant} when out of stock", {
                            variant: v.title,
                          })}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {t("Keep selling when out of stock")}
                  </label>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {errors && (
        <p className="px-6 pt-3 text-sm text-destructive">
          {t("Check the highlighted fields. Prices need a number, stock a whole number.")}
        </p>
      )}
      <p className="px-6 py-4 text-xs text-muted-foreground">
        {hasNew && <>{t("Leave the stock empty if you don't count stock.")} </>}
        {t(
          "Tracked variants hide from chat catalogs when they run out, unless they keep selling when out of stock.",
        )}
      </p>
    </ShopSection>
  );
}

function VariantField({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function StockControl({
  variantId,
  stock,
  title,
}: Readonly<{ variantId: string; stock: number; title: string }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(stock));
  const [note, setNote] = useState("");
  const history = useShopStockHistory(variantId, open);
  const set = useMutation({
    mutationFn: () => setVariantStock(variantId, Number(value), note.trim() || undefined),
    onSuccess: () => {
      toast.success(t("Stock updated"));
      setNote("");
      setOpen(false);
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not update stock"))),
  });
  const valid = /^\d+$/.test(value.trim());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(String(stock));
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t("Change stock for {variant}", { variant: title })}
          />
        }
      >
        <span className="tabular-nums">{stock}</span>
        <IconHistory data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold">
            {t("Stock for {variant}", { variant: title })}
          </span>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              aria-label={t("Units in stock")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button
              type="button"
              loading={set.isPending}
              disabled={!valid}
              onClick={() => set.mutate()}
            >
              {t("Set")}
            </Button>
          </div>
          <Input
            aria-label={t("Reason")}
            placeholder={t("Reason (optional), e.g. stock count")}
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <span className="text-xs font-semibold text-muted-foreground">{t("History")}</span>
            {history.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : (history.data ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">{t("No changes yet.")}</span>
            ) : (
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto overscroll-contain text-xs">
                {(history.data ?? []).map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {dayjs(m.createdAt).format("MMM D, HH:mm")} · {stockReason(t, m.reason)}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function stockReason(
  t: (key: string) => string,
  reason: "ORDER" | "CANCEL" | "RETURN" | "ADJUSTMENT" | "SYNC",
) {
  switch (reason) {
    case "ORDER":
      return t("Order");
    case "CANCEL":
      return t("Cancelled order");
    case "RETURN":
      return t("Return");
    case "ADJUSTMENT":
      return t("Adjusted");
    case "SYNC":
      return t("Store sync");
  }
}

function StatusSection({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  return (
    <ShopSection title={t("Status")}>
      <Controller
        control={form.control}
        name="status"
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={(value) => {
              if (value === "ACTIVE" || value === "DRAFT" || value === "ARCHIVED")
                field.onChange(value);
            }}
            items={[
              { value: "ACTIVE", label: t("Active") },
              { value: "DRAFT", label: t("Draft") },
              { value: "ARCHIVED", label: t("Archived") },
            ]}
          >
            <SelectTrigger className="w-full" aria-label={t("Status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
              <SelectItem value="DRAFT">{t("Draft")}</SelectItem>
              <SelectItem value="ARCHIVED">{t("Archived")}</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {t("Drafts stay off every channel until you activate them.")}
      </p>
    </ShopSection>
  );
}

function ChannelsSection({ form, product }: Readonly<{ form: Form; product?: ShopProduct }>) {
  const { t } = useTranslation();
  const status = product?.metaSyncStatus ?? "NOT_SYNCED";
  const rows = [
    { name: "showOnWhatsapp", label: t("WhatsApp catalog"), meta: true },
    { name: "showOnInstagram", label: t("Instagram shop & DMs"), meta: true },
    { name: "showOnFacebook", label: t("Facebook page"), meta: true },
    { name: "showOnStorefront", label: t("Storefront"), meta: false },
  ] as const;
  return (
    <ShopSection title={t("Where it sells")}>
      {rows.map((row) => (
        <Controller
          key={row.name}
          control={form.control}
          name={row.name}
          render={({ field }) => (
            <SettingRow
              title={row.label}
              control={
                <span className="flex items-center gap-2.5">
                  {field.value ? (
                    row.meta ? (
                      <SyncStatusChip status={status} error={product?.metaSyncError} />
                    ) : (
                      <ToneBadge tone="ok">{t("On")}</ToneBadge>
                    )
                  ) : (
                    <ToneBadge tone="mute">{t("Off")}</ToneBadge>
                  )}
                  <Switch
                    aria-label={row.label}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </span>
              }
            />
          )}
        />
      ))}
    </ShopSection>
  );
}

function CollectionsSection({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  const { data: collections = [] } = useShopCollections();
  return (
    <ShopSection title={t("Collections")}>
      <Controller
        control={form.control}
        name="collectionIds"
        render={({ field }) => (
          <MultiSelect
            options={collections.map((c) => ({ value: c.id, label: c.name }))}
            value={field.value}
            onValueChange={field.onChange}
            placeholder={collections.length ? t("Add to a collection") : t("No collections yet")}
            emptyIndicator={t("No collections found.")}
          />
        )}
      />
    </ShopSection>
  );
}

function PreviewSection({ form, currency }: Readonly<{ form: Form; currency: string }>) {
  const { t } = useTranslation();
  const [title, description, images, variants] = useWatch({
    control: form.control,
    name: ["title", "description", "images", "variants"],
  });
  const first = variants[0];
  const price = first?.price ? formatMoney(first.price, currency) : formatMoney(0, currency);
  const compare = first?.compareAtPrice ? formatMoney(first.compareAtPrice, currency) : null;
  return (
    <ShopSection title={t("How it looks in WhatsApp")}>
      <div className="rounded-lg bg-muted p-4">
        <div className="max-w-64 overflow-hidden rounded-xl bg-card shadow-xs">
          {images[0] ? (
            <img src={images[0]} alt="" className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-primary/10 text-sm text-muted-foreground">
              {t("Add a photo")}
            </div>
          )}
          <div className="flex flex-col gap-0.5 px-3 py-2.5">
            <span className="truncate font-bold text-foreground">{title || t("Product name")}</span>
            <span className="text-[13px]">
              <strong>{price}</strong>{" "}
              {compare && <span className="text-muted-foreground line-through">{compare}</span>}
            </span>
            {description && (
              <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
            )}
          </div>
          <div className="border-t border-border py-2.5 text-center text-sm font-semibold text-primary">
            {t("View")}
          </div>
        </div>
      </div>
    </ShopSection>
  );
}

function LoyaltySection({ form }: Readonly<{ form: Form }>) {
  const { t } = useTranslation();
  const error = form.formState.errors.loyaltyMultiplier;
  return (
    <ShopSection title={t("Loyalty")}>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="product-multiplier">{t("Extra loyalty points")}</FieldLabel>
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground" aria-hidden>
            ×
          </span>
          <Input
            id="product-multiplier"
            inputMode="decimal"
            className="w-24"
            {...form.register("loyaltyMultiplier")}
          />
          <span className="text-sm text-muted-foreground">{t("points")}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {t(
            "Members earn this many times the usual points on this product. 1 is the usual amount, 2 gives ×2 points.",
          )}
        </span>
        {error && <FieldError errors={[error]} />}
      </Field>
    </ShopSection>
  );
}
