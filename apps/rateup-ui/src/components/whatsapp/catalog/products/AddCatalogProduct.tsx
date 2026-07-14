import { useForm } from "@mantine/form";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  useCreateBatchCatalogProducts,
  useCreateShopifyProduct,
  useUpdateCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import { ContainedTagInput } from "@/components/input/ContainedInput/ContainedInput.tsx";
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
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
        image: [{ url: "", tag: [] }],
        internal_label: [],
        link: "",
        price: 0,
        sale_price: 0,
        currencyCode: "INR",
        video: [{ url: "", tag: [] }],
        availability: "in stock",
        brand: "",
      };
    case CatalogProductType.HOTEL:
      return {
        type,
        hotel_id: "",
        name: "",
        description: "",
        tags: [],
        numbertags: [],
        address: { address: "", city: "" },
        latitude: "",
        longitude: "",
        base_price: 0.0,
        currencyCode: "INR",
        image: [{ url: "", tag: [] }],
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
        image: [{ url: "", tag: [] }],
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

const AddCatalogProduct = ({ catalogData, onCancel, productData = null }) => {
  const form = useForm({
    initialValues: getInitialValues(),
    validate: (values) => {
      if (values.type === CatalogProductType.PRODUCT_ITEM) {
        return {
          retailer_id: !values.retailer_id.length ? "required" : null,
          title: !values.title.length ? "required" : null,
          description: !values.description.length ? "required" : null,
          condition: !values.condition.length ? "required" : null,
          price: values.price < 0 ? "required" : null,
          sale_price: values.sale_price < 0 ? "required" : null,
          currencyCode: !values.currencyCode.length ? "required" : null,
          availability: !values.availability.length ? "required" : null,
          brand: !values.brand.length ? "required" : null,
        };
      }
      if (values.type === CatalogProductType.HOTEL) {
        return {
          hotel_id: !values.hotel_id.length ? "required" : null,
          name: !values.name.length ? "required" : null,
          description: !values.description.length ? "required" : null,
          base_price: values.base_price < 0 ? "required" : null,
          currencyCode: !values.currencyCode.length ? "required" : null,
        };
      }
      if (values.type === CatalogProductType.HOTEL_ROOM) {
        return {
          hotel_retailer_id: !values.hotel_retailer_id.length ? "required" : null,
          hotel_room_id: !values.hotel_room_id.length ? "required" : null,
          name: !values.name.length ? "required" : null,
          description: !values.description.length ? "required" : null,
          base_price: values.base_price < 0 ? "required" : null,
          currencyCode: !values.currencyCode.length ? "required" : null,
        };
      }
    },
  });

  useEffect(() => {
    if (catalogData) {
      const type =
        catalogData?.vertical === "commerce"
          ? CatalogProductType.PRODUCT_ITEM
          : catalogData?.vertical === "hotels"
            ? CatalogProductType.HOTEL
            : CatalogProductType.HOTEL_ROOM;
      form.setFieldValue("type", type);
      if (productData) {
        if (productData.image?.length) setImageUpload("url");
        const initialValues = getInitialValues(type);
        Object.keys(getInitialValues(type)).map((key) => {
          initialValues[key] = productData[key];
        });
        form.setInitialValues(initialValues);
        // @ts-expect-error form is typed from PRODUCT_ITEM initial values; union shapes are valid at runtime
        form.setValues(initialValues);
      } else {
        form.setInitialValues(getInitialValues(type));
        // @ts-expect-error form is typed from PRODUCT_ITEM initial values; union shapes are valid at runtime
        form.setValues(getInitialValues(type));
      }
    }
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
  const type = form.getValues().type;

  async function handleSave() {
    // ── Shopify mode ──────────────────────────────────────────────────────
    if (addToShopify && type === CatalogProductType.PRODUCT_ITEM) {
      const values = form.getValues() as any;

      form.setErrors({});
      const errs: Record<string, string> = {};
      if (!values.title?.length) errs.title = "required";
      if (!values.description?.length) errs.description = "required";
      if (!values.brand?.length) errs.brand = "required";
      if (values.price < 0) errs.price = "required";
      if (!values.currencyCode?.length) errs.currencyCode = "required";
      if (Object.keys(errs).length > 0) {
        form.setErrors(errs);
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
    if (form.validate().hasErrors) return;
    toast.loading(productData ? "Updating product…" : "Uploading product…", {
      id: "catalog-product",
    });
    const { type: formType, ...rest } = form.values;

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
                  <Field data-invalid={!!form.errors.retailer_id}>
                    <FieldLabel htmlFor="retailer_id">Product retailer ID *</FieldLabel>
                    <Input
                      id="retailer_id"
                      {...form.getInputProps("retailer_id")}
                      disabled={!!productData}
                      aria-invalid={!!form.errors.retailer_id}
                    />
                    <FieldError>{form.errors.retailer_id as string}</FieldError>
                  </Field>
                )}

                <Field data-invalid={!!form.errors.title}>
                  <FieldLabel htmlFor="title">Product title *</FieldLabel>
                  <Input
                    id="title"
                    {...form.getInputProps("title")}
                    aria-invalid={!!form.errors.title}
                  />
                  <FieldError>{form.errors.title as string}</FieldError>
                </Field>

                <Field data-invalid={!!form.errors.brand}>
                  <FieldLabel htmlFor="brand">Brand *</FieldLabel>
                  <Input
                    id="brand"
                    {...form.getInputProps("brand")}
                    aria-invalid={!!form.errors.brand}
                  />
                  <FieldError>{form.errors.brand as string}</FieldError>
                </Field>

                {!addToShopify && (
                  <Field>
                    <FieldLabel htmlFor="link">Website URL</FieldLabel>
                    <Input id="link" {...form.getInputProps("link")} />
                  </Field>
                )}

                <Field className="sm:col-span-2" data-invalid={!!form.errors.description}>
                  <FieldLabel htmlFor="description">Product description *</FieldLabel>
                  <Textarea
                    id="description"
                    rows={3}
                    maxLength={5000}
                    {...form.getInputProps("description")}
                    aria-invalid={!!form.errors.description}
                  />
                  <FieldError>{form.errors.description as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* Pricing & availability */}
            <FieldSet>
              <FieldLegend>Pricing & availability</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!form.errors.price}>
                  <FieldLabel htmlFor="price">Price *</FieldLabel>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={form.values.price}
                    onChange={(e) => form.setFieldValue("price", Number(e.target.value))}
                    aria-invalid={!!form.errors.price}
                  />
                  <FieldError>{form.errors.price as string}</FieldError>
                </Field>

                {!addToShopify && (
                  <Field data-invalid={!!form.errors.sale_price}>
                    <FieldLabel htmlFor="sale_price">Sale price *</FieldLabel>
                    <Input
                      id="sale_price"
                      type="number"
                      min={0}
                      value={form.values.sale_price}
                      onChange={(e) => form.setFieldValue("sale_price", Number(e.target.value))}
                      aria-invalid={!!form.errors.sale_price}
                    />
                    <FieldError>{form.errors.sale_price as string}</FieldError>
                  </Field>
                )}

                <Field data-invalid={!!form.errors.currencyCode}>
                  <FieldLabel htmlFor="currency">Currency *</FieldLabel>
                  <Select
                    value={form.values.currencyCode}
                    onValueChange={(v) => form.setFieldValue("currencyCode", v)}
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
                  <FieldError>{form.errors.currencyCode as string}</FieldError>
                </Field>

                {!addToShopify && (
                  <Field data-invalid={!!form.errors.availability}>
                    <FieldLabel htmlFor="availability">Availability *</FieldLabel>
                    <Select
                      value={form.values.availability}
                      onValueChange={(v) => form.setFieldValue("availability", v)}
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
                    <FieldError>{form.errors.availability as string}</FieldError>
                  </Field>
                )}

                {!addToShopify && (
                  <Field data-invalid={!!form.errors.condition}>
                    <FieldLabel htmlFor="condition">Product condition *</FieldLabel>
                    <Select
                      value={form.values.condition}
                      onValueChange={(v) => form.setFieldValue("condition", v)}
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
                    <FieldError>{form.errors.condition as string}</FieldError>
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>

            {/* Media */}
            <FieldSet>
              <FieldLegend>Media</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Image</FieldLabel>
                  <SourceToggle value={imageUpload} onChange={setImageUpload} />
                  {imageUpload === "upload" ? (
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                    />
                  ) : (
                    <Input {...form.getInputProps("image.0.url")} placeholder="Enter image link" />
                  )}
                  <FieldDescription>Minimum 500×500.</FieldDescription>
                </Field>

                {!addToShopify && (
                  <Field>
                    <FieldLabel>Image tags</FieldLabel>
                    <ContainedTagInput {...form.getInputProps("image.0.tag")} label={undefined} />
                  </Field>
                )}

                {!addToShopify && (
                  <Field>
                    <FieldLabel>Video</FieldLabel>
                    <SourceToggle value={videoUpload} onChange={setVideoUpload} />
                    {videoUpload === "upload" ? (
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                      />
                    ) : (
                      <Input
                        {...form.getInputProps("video.0.url")}
                        placeholder="Enter video link"
                      />
                    )}
                  </Field>
                )}

                {!addToShopify && (
                  <Field>
                    <FieldLabel>Video tags</FieldLabel>
                    <ContainedTagInput {...form.getInputProps("video.0.tag")} label={undefined} />
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
                    <FieldLabel>Internal labels</FieldLabel>
                    <ContainedTagInput
                      {...form.getInputProps("internal_label")}
                      maxTags={5}
                      label={undefined}
                    />
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
                <Field data-invalid={!!form.errors.hotel_id}>
                  <FieldLabel htmlFor="hotel_id">Hotel ID *</FieldLabel>
                  <Input id="hotel_id" {...form.getInputProps("hotel_id")} />
                  <FieldError>{form.errors.hotel_id as string}</FieldError>
                </Field>
                <Field data-invalid={!!form.errors.name}>
                  <FieldLabel htmlFor="hotel_name">Hotel name *</FieldLabel>
                  <Input id="hotel_name" {...form.getInputProps("name")} />
                  <FieldError>{form.errors.name as string}</FieldError>
                </Field>
                <Field className="sm:col-span-2" data-invalid={!!form.errors.description}>
                  <FieldLabel htmlFor="hotel_desc">Description *</FieldLabel>
                  <Textarea
                    id="hotel_desc"
                    rows={4}
                    maxLength={5000}
                    {...form.getInputProps("description")}
                  />
                  <FieldError>{form.errors.description as string}</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Address</FieldLabel>
                  <Input {...form.getInputProps("address.address")} />
                </Field>
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <Input {...form.getInputProps("address.city")} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Pricing</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!form.errors.base_price}>
                  <FieldLabel htmlFor="hotel_price">Price *</FieldLabel>
                  <Input
                    id="hotel_price"
                    type="number"
                    min={0}
                    value={form.values.base_price}
                    onChange={(e) => form.setFieldValue("base_price", Number(e.target.value))}
                  />
                  <FieldError>{form.errors.base_price as string}</FieldError>
                </Field>
                <Field data-invalid={!!form.errors.currencyCode}>
                  <FieldLabel htmlFor="hotel_currency">Currency *</FieldLabel>
                  <Select
                    value={form.values.currencyCode}
                    onValueChange={(v) => form.setFieldValue("currencyCode", v)}
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
                  <FieldError>{form.errors.currencyCode as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Media & tags</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Image link</FieldLabel>
                  <Input {...form.getInputProps("image.0.url")} />
                </Field>
                <Field>
                  <FieldLabel>Image tags</FieldLabel>
                  <ContainedTagInput {...form.getInputProps("image.0.tag")} label={undefined} />
                </Field>
                <Field>
                  <FieldLabel>Tags</FieldLabel>
                  <ContainedTagInput
                    {...form.getInputProps("tags")}
                    maxTags={5}
                    label={undefined}
                  />
                </Field>
                <Field>
                  <FieldLabel>Number tags</FieldLabel>
                  <ContainedTagInput
                    {...form.getInputProps("numbertags")}
                    maxTags={5}
                    label={undefined}
                  />
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
                <Field data-invalid={!!form.errors.hotel_retailer_id}>
                  <FieldLabel htmlFor="hotel_retailer_id">Hotel retailer ID *</FieldLabel>
                  <Input id="hotel_retailer_id" {...form.getInputProps("hotel_retailer_id")} />
                  <FieldError>{form.errors.hotel_retailer_id as string}</FieldError>
                </Field>
                <Field data-invalid={!!form.errors.hotel_room_id}>
                  <FieldLabel htmlFor="hotel_room_id">Hotel room ID *</FieldLabel>
                  <Input id="hotel_room_id" {...form.getInputProps("hotel_room_id")} />
                  <FieldError>{form.errors.hotel_room_id as string}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="room_name">Name</FieldLabel>
                  <Input id="room_name" {...form.getInputProps("name")} />
                </Field>
                <Field className="sm:col-span-2" data-invalid={!!form.errors.description}>
                  <FieldLabel htmlFor="room_desc">Description *</FieldLabel>
                  <Textarea
                    id="room_desc"
                    rows={3}
                    maxLength={5000}
                    {...form.getInputProps("description")}
                  />
                  <FieldError>{form.errors.description as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Pricing</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!form.errors.base_price}>
                  <FieldLabel htmlFor="room_price">Price *</FieldLabel>
                  <Input
                    id="room_price"
                    type="number"
                    min={0}
                    value={form.values.base_price}
                    onChange={(e) => form.setFieldValue("base_price", Number(e.target.value))}
                  />
                  <FieldError>{form.errors.base_price as string}</FieldError>
                </Field>
                <Field data-invalid={!!form.errors.currencyCode}>
                  <FieldLabel htmlFor="room_currency">Currency *</FieldLabel>
                  <Select
                    value={form.values.currencyCode}
                    onValueChange={(v) => form.setFieldValue("currencyCode", v)}
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
                  <FieldError>{form.errors.currencyCode as string}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Media</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Image link</FieldLabel>
                  <Input {...form.getInputProps("image.0.url")} />
                </Field>
                <Field>
                  <FieldLabel>Image tags</FieldLabel>
                  <ContainedTagInput {...form.getInputProps("image.0.tag")} label={undefined} />
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
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {addToShopify ? "Add to Shopify" : productData ? "Save changes" : "Add product"}
        </Button>
      </DialogFooter>
    </>
  );
};

export const AddCatalogProductModal = ({ catalogData, opened, close, productData = null }) => {
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
