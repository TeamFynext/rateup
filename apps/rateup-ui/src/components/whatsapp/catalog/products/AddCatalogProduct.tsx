import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useId, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import type { WaCatalog } from "@/backend/whatsapp/catalog/catalog.api";
import {
  useCreateBatchCatalogProducts,
  useCreateShopifyProduct,
  useUpdateCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { TagsInput } from "@/components/ui/tags-input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { CatalogProductType } from "@/types/enums.ts";
import {
  CATALOG_PRODUCT_AVAILABILITY,
  CATALOG_PRODUCT_CONDITIONS,
  CURRENCY_CODES,
} from "@/utils/constants.ts";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

function getInitialValues(type = CatalogProductType.PRODUCT_ITEM) {
  switch (type) {
    case CatalogProductType.PRODUCT_ITEM:
      return {
        type,
        retailer_id: "",
        title: "",
        description: "",
        condition: "new",
        image: [{ url: "", tag: [] as string[] }],
        internal_label: [] as string[],
        link: "",
        price: 0,
        sale_price: 0,
        currencyCode: "INR",
        video: [{ url: "", tag: [] as string[] }],
        availability: "in stock",
        brand: "",
      };
    case CatalogProductType.HOTEL:
      return {
        type,
        hotel_id: "",
        name: "",
        description: "",
        tags: [] as string[],
        numbertags: [] as string[],
        address: { address: "", city: "" },
        latitude: "",
        longitude: "",
        base_price: 0.0,
        currencyCode: "INR",
        image: [{ url: "", tag: [] as string[] }],
      };
    case CatalogProductType.HOTEL_ROOM:
      return {
        type,
        hotel_retailer_id: "",
        hotel_room_id: "",
        name: "",
        description: "",
        base_price: 0.0,
        currencyCode: "INR",
        image: [{ url: "", tag: [] as string[] }],
      };
  }
}

/** Upload-vs-link switch shared by the image and video fields. */
function SourceToggle({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0])}
      size="sm"
      className="w-fit"
    >
      <ToggleGroupItem value="upload">Upload</ToggleGroupItem>
      <ToggleGroupItem value="url">Link</ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Conditional required-field validation mirroring the original Mantine `validate`. */
const catalogProductSchema = z
  .object({ type: z.any() })
  .passthrough()
  .superRefine((values: any, ctx) => {
    const require = (field: string, invalid: boolean) => {
      if (invalid) ctx.addIssue({ code: "custom", path: [field], message: "required" });
    };
    if (values.type === CatalogProductType.PRODUCT_ITEM) {
      require("retailer_id", !values.retailer_id?.length);
      require("title", !values.title?.length);
      require("description", !values.description?.length);
      require("condition", !values.condition?.length);
      require("price", values.price < 0);
      require("sale_price", values.sale_price < 0);
      require("currencyCode", !values.currencyCode?.length);
      require("availability", !values.availability?.length);
      require("brand", !values.brand?.length);
    } else if (values.type === CatalogProductType.HOTEL) {
      require("hotel_id", !values.hotel_id?.length);
      require("name", !values.name?.length);
      require("description", !values.description?.length);
      require("base_price", values.base_price < 0);
      require("currencyCode", !values.currencyCode?.length);
    } else if (values.type === CatalogProductType.HOTEL_ROOM) {
      require("hotel_retailer_id", !values.hotel_retailer_id?.length);
      require("hotel_room_id", !values.hotel_room_id?.length);
      require("name", !values.name?.length);
      require("description", !values.description?.length);
      require("base_price", values.base_price < 0);
      require("currencyCode", !values.currencyCode?.length);
    }
  });

/** Controller-wrapped TagsInput for RHF array fields. */
function TagController({
  control,
  name,
  maxTags,
}: Readonly<{ control: any; name: string; maxTags?: number }>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TagsInput value={field.value ?? []} onValueChange={field.onChange} maxTags={maxTags} />
      )}
    />
  );
}

const AddCatalogProduct = ({
  catalogData,
  onCancel,
  productData = null,
}: {
  catalogData: Pick<WaCatalog, "catalogId"> & { vertical?: string };
  onCancel: () => void;
  productData?: ({ image?: unknown[] } & Record<string, unknown>) | null;
}) => {
  const uid = useId();
  const form = useForm<any>({
    resolver: zodResolver(catalogProductSchema),
    defaultValues: getInitialValues(),
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (catalogData) {
      const type =
        catalogData?.vertical === "commerce"
          ? CatalogProductType.PRODUCT_ITEM
          : catalogData?.vertical === "hotels"
            ? CatalogProductType.HOTEL
            : CatalogProductType.HOTEL_ROOM;
      if (productData) {
        if (productData.image?.length) setImageUpload("url");
        const initialValues = getInitialValues(type);
        // Copies only the keys the chosen product type declares.
        const values = initialValues as Record<string, unknown>;
        Object.keys(initialValues).forEach((key) => {
          values[key] = productData[key];
        });
        form.reset(initialValues);
      } else {
        form.reset(getInitialValues(type));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogData, productData]);

  const createBatch = useCreateBatchCatalogProducts(catalogData?.catalogId);
  const updateProducts = useUpdateCatalogProducts(catalogData?.catalogId);
  const createShopifyMut = useCreateShopifyProduct(catalogData?.catalogId);

  const [addToShopify] = useState(false);
  const [imageUpload, setImageUpload] = useState("upload");
  const [image, setImage] = useState(null);
  const [videoUpload, setVideoUpload] = useState("upload");
  const [video, setVideo] = useState(null);

  const isSaving = createBatch.isPending || updateProducts.isPending || createShopifyMut.isPending;
  const type = form.watch("type");

  async function handleSave(values: any) {
    // ── Shopify mode ──────────────────────────────────────────────────────
    if (addToShopify && type === CatalogProductType.PRODUCT_ITEM) {
      form.clearErrors();
      const errs: Record<string, string> = {};
      if (!values.title?.length) errs.title = "required";
      if (!values.description?.length) errs.description = "required";
      if (!values.brand?.length) errs.brand = "required";
      if (values.price < 0) errs.price = "required";
      if (!values.currencyCode?.length) errs.currencyCode = "required";
      if (Object.keys(errs).length > 0) {
        Object.entries(errs).forEach(([k, v]) => form.setError(k as any, { message: v }));
        return;
      }

      let imageUrl: string | undefined;
      try {
        if (imageUpload === "upload" && image) {
          const key = await uploadFile(image);
          imageUrl = getFileUrlFromKey(key);
        } else if (values.image?.[0]?.url) {
          imageUrl = values.image[0].url;
        }
      } catch {}

      toast.loading("Adding product to Shopify...", { id: "catalog-product" });

      createShopifyMut.mutate(
        {
          title: values.title,
          description: values.description,
          brand: values.brand,
          price: values.price,
          currencyCode: values.currencyCode,
          imageUrl,
        },
        {
          onSuccess: () => {
            toast.success("Product added to Shopify and imported to catalog!", {
              id: "catalog-product",
            });
            cancel();
          },
          onError: (error) => {
            toast.error(error?.message || "Failed to add product to Shopify", {
              id: "catalog-product",
            });
          },
        },
      );
      return;
    }

    // ── Meta catalog mode ─────────────────────────────────────────────────
    toast.loading(productData ? "Updating product…" : "Uploading product…", {
      id: "catalog-product",
    });
    const { type: formType, ...rest } = values;

    try {
      if (imageUpload === "upload" && image) {
        const key = await uploadFile(image);
        rest.image[0].url = getFileUrlFromKey(key);
      }
      if (videoUpload === "upload" && video) {
        const key = await uploadFile(video);
        rest.video[0].url = getFileUrlFromKey(key);
      }
    } catch {}

    const data = { type: formType, [formType]: [{ ...rest }] };

    if (productData) {
      updateProducts.mutate(data, {
        onSuccess: () => {
          toast.success("Product updated", { id: "catalog-product" });
          cancel();
        },
        onError: (error) => {
          toast.error(error?.message || "Product update failed", { id: "catalog-product" });
        },
      });
      return;
    }

    createBatch.mutate(data, {
      onSuccess: () => {
        toast.success("Product uploaded", { id: "catalog-product" });
        cancel();
      },
      onError: (error) => {
        toast.error(error?.message || "Product failed", { id: "catalog-product" });
      },
    });
  }

  function cancel() {
    form.reset();
    onCancel();
  }

  return (
    <>
      {/* Scrollable body */}
      <div className="-mx-6 flex-1 overflow-y-auto px-6">
        {type === CatalogProductType.PRODUCT_ITEM && (
          <div className="flex flex-col gap-6">
            {/* Basics */}
            <FieldSet>
              <FieldLegend>Product details</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!addToShopify && (
                  <Field data-invalid={!!errors.retailer_id}>
                    <FieldLabel htmlFor="retailer_id">Product retailer ID *</FieldLabel>
                    <Input
                      id="retailer_id"
                      {...form.register("retailer_id")}
                      disabled={!!productData}
                      aria-invalid={!!errors.retailer_id}
                    />
                    <FieldError>{errors.retailer_id?.message as string}</FieldError>
                  </Field>
                )}

                <Field data-invalid={!!errors.title}>
                  <FieldLabel htmlFor="title">Product title *</FieldLabel>
                  <Input id="title" {...form.register("title")} aria-invalid={!!errors.title} />
                  <FieldError>{errors.title?.message as string}</FieldError>
                </Field>

                <Field data-invalid={!!errors.brand}>
                  <FieldLabel htmlFor="brand">Brand *</FieldLabel>
                  <Input id="brand" {...form.register("brand")} aria-invalid={!!errors.brand} />
                  <FieldError>{errors.brand?.message as string}</FieldError>
                </Field>

                {!addToShopify && (
                  <Field>
                    <FieldLabel htmlFor="link">Website URL</FieldLabel>
                    <Input id="link" {...form.register("link")} />
                  </Field>
                )}

                <Field className="sm:col-span-2" data-invalid={!!errors.description}>
                  <FieldLabel htmlFor="description">Product description *</FieldLabel>
                  <Textarea
                    id="description"
                    rows={3}
                    maxLength={5000}
                    {...form.register("description")}
                    aria-invalid={!!errors.description}
                  />
                  <FieldError>{errors.description?.message as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* Pricing & availability */}
            <FieldSet>
              <FieldLegend>Pricing & availability</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.price}>
                  <FieldLabel htmlFor="price">Price *</FieldLabel>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={form.watch("price")}
                    onChange={(e) => form.setValue("price", Number(e.target.value))}
                    aria-invalid={!!errors.price}
                  />
                  <FieldError>{errors.price?.message as string}</FieldError>
                </Field>

                {!addToShopify && (
                  <Field data-invalid={!!errors.sale_price}>
                    <FieldLabel htmlFor="sale_price">Sale price *</FieldLabel>
                    <Input
                      id="sale_price"
                      type="number"
                      min={0}
                      value={form.watch("sale_price")}
                      onChange={(e) => form.setValue("sale_price", Number(e.target.value))}
                      aria-invalid={!!errors.sale_price}
                    />
                    <FieldError>{errors.sale_price?.message as string}</FieldError>
                  </Field>
                )}

                <Field data-invalid={!!errors.currencyCode}>
                  <FieldLabel htmlFor="currency">Currency *</FieldLabel>
                  <Select
                    value={form.watch("currencyCode")}
                    onValueChange={(v) => form.setValue("currencyCode", v)}
                    items={CURRENCY_CODES.map((c) => ({ value: c, label: c }))}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_CODES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.currencyCode?.message as string}</FieldError>
                </Field>

                {!addToShopify && (
                  <Field data-invalid={!!errors.availability}>
                    <FieldLabel htmlFor="availability">Availability *</FieldLabel>
                    <Select
                      value={form.watch("availability")}
                      onValueChange={(v) => form.setValue("availability", v)}
                      items={CATALOG_PRODUCT_AVAILABILITY.map((a) => ({ value: a, label: a }))}
                    >
                      <SelectTrigger id="availability">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATALOG_PRODUCT_AVAILABILITY.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{errors.availability?.message as string}</FieldError>
                  </Field>
                )}

                {!addToShopify && (
                  <Field data-invalid={!!errors.condition}>
                    <FieldLabel htmlFor="condition">Product condition *</FieldLabel>
                    <Select
                      value={form.watch("condition")}
                      onValueChange={(v) => form.setValue("condition", v)}
                      items={CATALOG_PRODUCT_CONDITIONS.map((c) => ({ value: c, label: c }))}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATALOG_PRODUCT_CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{errors.condition?.message as string}</FieldError>
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>

            {/* Media */}
            <FieldSet>
              <FieldLegend>Media</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldTitle>Image</FieldTitle>
                  <SourceToggle value={imageUpload} onChange={setImageUpload} />
                  {imageUpload === "upload" ? (
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                    />
                  ) : (
                    <Input {...form.register("image.0.url")} placeholder="Enter image link" />
                  )}
                  <FieldDescription>Minimum 500×500.</FieldDescription>
                </Field>

                {!addToShopify && (
                  <Field>
                    <FieldTitle>Image tags</FieldTitle>
                    <TagController control={form.control} name="image.0.tag" />
                  </Field>
                )}

                {!addToShopify && (
                  <Field>
                    <FieldTitle>Video</FieldTitle>
                    <SourceToggle value={videoUpload} onChange={setVideoUpload} />
                    {videoUpload === "upload" ? (
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                      />
                    ) : (
                      <Input {...form.register("video.0.url")} placeholder="Enter video link" />
                    )}
                  </Field>
                )}

                {!addToShopify && (
                  <Field>
                    <FieldTitle>Video tags</FieldTitle>
                    <TagController control={form.control} name="video.0.tag" />
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>

            {/* Organization */}
            {!addToShopify && (
              <FieldSet>
                <FieldLegend>Organization</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldTitle>Internal labels</FieldTitle>
                    <TagController control={form.control} name="internal_label" maxTags={5} />
                    <FieldDescription>Up to 5 labels, for your own filtering.</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            )}
          </div>
        )}

        {type === CatalogProductType.HOTEL && (
          <div className="flex flex-col gap-6">
            <FieldSet>
              <FieldLegend>Hotel details</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.hotel_id}>
                  <FieldLabel htmlFor="hotel_id">Hotel ID *</FieldLabel>
                  <Input id="hotel_id" {...form.register("hotel_id")} />
                  <FieldError>{errors.hotel_id?.message as string}</FieldError>
                </Field>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="hotel_name">Hotel name *</FieldLabel>
                  <Input id="hotel_name" {...form.register("name")} />
                  <FieldError>{errors.name?.message as string}</FieldError>
                </Field>
                <Field className="sm:col-span-2" data-invalid={!!errors.description}>
                  <FieldLabel htmlFor="hotel_desc">Description *</FieldLabel>
                  <Textarea
                    id="hotel_desc"
                    rows={4}
                    maxLength={5000}
                    {...form.register("description")}
                  />
                  <FieldError>{errors.description?.message as string}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${uid}-address`}>Address</FieldLabel>
                  <Input id={`${uid}-address`} {...form.register("address.address")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${uid}-city`}>City</FieldLabel>
                  <Input id={`${uid}-city`} {...form.register("address.city")} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Pricing</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.base_price}>
                  <FieldLabel htmlFor="hotel_price">Price *</FieldLabel>
                  <Input
                    id="hotel_price"
                    type="number"
                    min={0}
                    value={form.watch("base_price")}
                    onChange={(e) => form.setValue("base_price", Number(e.target.value))}
                  />
                  <FieldError>{errors.base_price?.message as string}</FieldError>
                </Field>
                <Field data-invalid={!!errors.currencyCode}>
                  <FieldLabel htmlFor="hotel_currency">Currency *</FieldLabel>
                  <Select
                    value={form.watch("currencyCode")}
                    onValueChange={(v) => form.setValue("currencyCode", v)}
                    items={CURRENCY_CODES.map((c) => ({ value: c, label: c }))}
                  >
                    <SelectTrigger id="hotel_currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_CODES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.currencyCode?.message as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Media & tags</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${uid}-image-link`}>Image link</FieldLabel>
                  <Input id={`${uid}-image-link`} {...form.register("image.0.url")} />
                </Field>
                <Field>
                  <FieldTitle>Image tags</FieldTitle>
                  <TagController control={form.control} name="image.0.tag" />
                </Field>
                <Field>
                  <FieldTitle>Tags</FieldTitle>
                  <TagController control={form.control} name="tags" maxTags={5} />
                </Field>
                <Field>
                  <FieldTitle>Number tags</FieldTitle>
                  <TagController control={form.control} name="numbertags" maxTags={5} />
                  <FieldDescription>
                    Decimals only — commas not allowed (e.g. 2024)
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        )}

        {type === CatalogProductType.HOTEL_ROOM && (
          <div className="flex flex-col gap-6">
            <FieldSet>
              <FieldLegend>Room details</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.hotel_retailer_id}>
                  <FieldLabel htmlFor="hotel_retailer_id">Hotel retailer ID *</FieldLabel>
                  <Input id="hotel_retailer_id" {...form.register("hotel_retailer_id")} />
                  <FieldError>{errors.hotel_retailer_id?.message as string}</FieldError>
                </Field>
                <Field data-invalid={!!errors.hotel_room_id}>
                  <FieldLabel htmlFor="hotel_room_id">Hotel room ID *</FieldLabel>
                  <Input id="hotel_room_id" {...form.register("hotel_room_id")} />
                  <FieldError>{errors.hotel_room_id?.message as string}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="room_name">Name</FieldLabel>
                  <Input id="room_name" {...form.register("name")} />
                </Field>
                <Field className="sm:col-span-2" data-invalid={!!errors.description}>
                  <FieldLabel htmlFor="room_desc">Description *</FieldLabel>
                  <Textarea
                    id="room_desc"
                    rows={3}
                    maxLength={5000}
                    {...form.register("description")}
                  />
                  <FieldError>{errors.description?.message as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Pricing</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.base_price}>
                  <FieldLabel htmlFor="room_price">Price *</FieldLabel>
                  <Input
                    id="room_price"
                    type="number"
                    min={0}
                    value={form.watch("base_price")}
                    onChange={(e) => form.setValue("base_price", Number(e.target.value))}
                  />
                  <FieldError>{errors.base_price?.message as string}</FieldError>
                </Field>
                <Field data-invalid={!!errors.currencyCode}>
                  <FieldLabel htmlFor="room_currency">Currency *</FieldLabel>
                  <Select
                    value={form.watch("currencyCode")}
                    onValueChange={(v) => form.setValue("currencyCode", v)}
                    items={CURRENCY_CODES.map((c) => ({ value: c, label: c }))}
                  >
                    <SelectTrigger id="room_currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_CODES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.currencyCode?.message as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Media</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${uid}-image-link-2`}>Image link</FieldLabel>
                  <Input id={`${uid}-image-link-2`} {...form.register("image.0.url")} />
                </Field>
                <Field>
                  <FieldTitle>Image tags</FieldTitle>
                  <TagController control={form.control} name="image.0.tag" />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={cancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={form.handleSubmit(handleSave)} disabled={isSaving}>
          {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {addToShopify ? "Add to Shopify" : productData ? "Save changes" : "Add product"}
        </Button>
      </DialogFooter>
    </>
  );
};

export const AddCatalogProductModal = ({
  catalogData,
  opened,
  close,
  productData = null,
}: {
  catalogData: Pick<WaCatalog, "catalogId"> & { vertical?: string };
  opened: boolean;
  close: () => void;
  productData?: Record<string, unknown> | null;
}) => {
  return (
    <Dialog open={opened} onOpenChange={(val) => !val && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{productData ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {productData
              ? "Update this item in your Meta catalog."
              : "Add a new item to your Meta catalog."}
          </DialogDescription>
        </DialogHeader>
        <AddCatalogProduct catalogData={catalogData} onCancel={close} productData={productData} />
      </DialogContent>
    </Dialog>
  );
};
