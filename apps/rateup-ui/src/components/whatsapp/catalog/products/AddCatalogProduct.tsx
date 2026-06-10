"use client";

import { useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { toast } from "sonner";

import { CatalogProductType } from "@/types/enums.ts";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
        image: [
          {
            url: "",
            tag: [],
          },
        ],
        internal_label: [],
        link: "",
        price: 0,
        sale_price: 0,
        currencyCode: "INR",
        video: [
          {
            url: "",
            tag: [],
          },
        ],
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
        address: {
          address: "",
          city: "",
        },
        latitude: "",
        longitude: "",
        base_price: 0.0,
        currencyCode: "INR",
        image: [
          {
            url: "",
            tag: [],
          },
        ],
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
        image: [
          {
            url: "",
            tag: [],
          },
        ],
      };
  }
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
          // address: {
          //   address: !values.address.address.length ? "required" : null,
          //   city: !values.address.city.length ? "required" : null
          // },
          // latitude: "",
          // longitude: "",
          base_price: values.base_price < 0 ? "required" : null,
          currencyCode: !values.currencyCode.length ? "required" : null,
        };
      }
      if (values.type === CatalogProductType.HOTEL_ROOM) {
        return {
          hotel_retailer_id: !values.hotel_retailer_id.length
            ? "required"
            : null,
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
        if (productData.image.length) setImageUpload("url");
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

  const [addToShopify, setAddToShopify] = useState(false);
  const [imageUpload, setImageUpload] = useState("upload");
  const [image, setImage] = useState(null);
  const [videoUpload, setVideoUpload] = useState("upload");
  const [video, setVideo] = useState(null);

  async function handleSave() {
    // ── Shopify mode ──────────────────────────────────────────────────────
    if (
      addToShopify &&
      form.getValues().type === CatalogProductType.PRODUCT_ITEM
    ) {
      const values = form.getValues() as any;

      // Minimal validation for Shopify-required fields
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
      } catch (e) {}

      toast.loading("Adding product to Shopify...", {
        id: "catalog-product",
      });

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
    const loadinggMessage = productData
      ? "Updating Product"
      : "Uploading product..";
    toast.loading(loadinggMessage, {
      id: "catalog-product",
    });
    const { type, ...rest } = form.values;

    try {
      if (imageUpload === "upload" && image) {
        const key = await uploadFile(image);
        rest.image[0].url = getFileUrlFromKey(key);
      }
      if (videoUpload === "upload" && video) {
        const key = await uploadFile(image);
        rest.video[0].url = getFileUrlFromKey(key);
      }
    } catch (e) {}
    const data = {
      type,
      [type]: [{ ...rest }],
    };

    if (productData) {
      updateProducts.mutate(data, {
        onSuccess: () => {
          toast.success("Prodcut Updated", {
            id: "catalog-product",
          });
          cancel();
        },
        onError: (error) => {
          toast.error(error?.message || "Product updation failed", {
            id: "catalog-product",
          });
        },
      });
      return;
    }
    createBatch.mutate(data, {
      onSuccess: () => {
        toast.success("Prodcut Uploaded", {
          id: "catalog-product",
        });
        cancel();
      },
      onError: (error) => {
        toast.error(error?.message || "Product failed", {
          id: "catalog-product",
        });
      },
    });
  }

  function cancel() {
    form.reset();
    onCancel();
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          onClick={handleSave}
          disabled={
            createBatch.isPending ||
            updateProducts.isPending ||
            createShopifyMut.isPending
          }
        >
          {addToShopify ? "Add to Shopify" : "Save"}
        </Button>
      </div>

      <Field>
        <FieldLabel>Item Type</FieldLabel>
        <Select
          value={form.values.type}
          onValueChange={(v) =>
            form.setFieldValue("type", v as CatalogProductType)
          }
          disabled
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CatalogProductType).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {form.getValues().type === "PRODUCT_ITEM" && (
        <div className="grid grid-cols-2 gap-4">
          {!addToShopify && (
            <Field data-invalid={!!form.errors.retailer_id}>
              <FieldLabel>Product Retailer ID *</FieldLabel>
              <Input
                {...form.getInputProps("retailer_id")}
                disabled={!!productData}
              />
              <FieldError>{form.errors.retailer_id as string}</FieldError>
            </Field>
          )}
          <Field data-invalid={!!form.errors.title}>
            <FieldLabel>Product Title *</FieldLabel>
            <Input {...form.getInputProps("title")} />
            <FieldError>{form.errors.title as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.description}>
            <FieldLabel>Product Description *</FieldLabel>
            <Textarea
              {...form.getInputProps("description")}
              rows={3}
              maxLength={5000}
            />
            <FieldError>{form.errors.description as string}</FieldError>
          </Field>
          {!addToShopify && (
            <Field>
              <FieldLabel>Internal Labels</FieldLabel>
              <ContainedTagInput
                {...form.getInputProps("internal_label")}
                maxTags={5}
                label={undefined}
              />
            </Field>
          )}
          {!addToShopify && (
            <Field data-invalid={!!form.errors.condition}>
              <FieldLabel>Product Condition *</FieldLabel>
              <Select
                value={form.values.condition}
                onValueChange={(v) => form.setFieldValue("condition", v)}
              >
                <SelectTrigger>
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
          {!addToShopify && (
            <Field data-invalid={!!form.errors.availability}>
              <FieldLabel>Availability *</FieldLabel>
              <Select
                value={form.values.availability}
                onValueChange={(v) => form.setFieldValue("availability", v)}
              >
                <SelectTrigger>
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
          <Field data-invalid={!!form.errors.brand}>
            <FieldLabel>Brand *</FieldLabel>
            <Input {...form.getInputProps("brand")} />
            <FieldError>{form.errors.brand as string}</FieldError>
          </Field>
          {!addToShopify && (
            <Field>
              <FieldLabel>Website URL</FieldLabel>
              <Input {...form.getInputProps("link")} />
            </Field>
          )}
          <div className="flex items-end gap-2">
            <Field data-invalid={!!form.errors.price}>
              <FieldLabel>Price *</FieldLabel>
              <Input
                type="number"
                min={0}
                className="w-37.5"
                value={form.values.price}
                onChange={(e) =>
                  form.setFieldValue("price", Number(e.target.value))
                }
              />
              <FieldError>{form.errors.price as string}</FieldError>
            </Field>
            {!addToShopify && (
              <Field data-invalid={!!form.errors.sale_price}>
                <FieldLabel>Sale Price *</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  className="w-37.5"
                  value={form.values.sale_price}
                  onChange={(e) =>
                    form.setFieldValue("sale_price", Number(e.target.value))
                  }
                />
                <FieldError>{form.errors.sale_price as string}</FieldError>
              </Field>
            )}
          </div>
          <Field data-invalid={!!form.errors.currencyCode}>
            <FieldLabel>Currency *</FieldLabel>
            <Select
              value={form.values.currencyCode}
              onValueChange={(v) => form.setFieldValue("currencyCode", v)}
            >
              <SelectTrigger>
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
          <Field>
            <div className="flex items-center gap-3">
              <FieldLabel className="mb-0">
                Image{" "}
                <span className="text-[10px] text-destructive">
                  (Min 500x500)
                </span>
              </FieldLabel>
              <RadioGroup
                value={imageUpload}
                onValueChange={setImageUpload}
                className="flex flex-row gap-3 w-auto"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="upload" id="img-upload" />
                  <FieldLabel
                    htmlFor="img-upload"
                    className="font-normal cursor-pointer mb-0"
                  >
                    Upload
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="url" id="img-url" />
                  <FieldLabel
                    htmlFor="img-url"
                    className="font-normal cursor-pointer mb-0"
                  >
                    Link
                  </FieldLabel>
                </div>
              </RadioGroup>
            </div>
            {imageUpload === "upload" ? (
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            ) : (
              <Input
                {...form.getInputProps("image.0.url")}
                placeholder="Enter link"
              />
            )}
          </Field>
          {!addToShopify && (
            <Field>
              <FieldLabel>Image Tags</FieldLabel>
              <ContainedTagInput
                {...form.getInputProps("image.0.tag")}
                label={undefined}
              />
            </Field>
          )}
          {!addToShopify && (
            <Field>
              <div className="flex items-center gap-3">
                <FieldLabel className="mb-0">Video</FieldLabel>
                <RadioGroup
                  value={videoUpload}
                  onValueChange={setVideoUpload}
                  className="flex flex-row gap-3 w-auto"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="upload" id="vid-upload" />
                    <FieldLabel
                      htmlFor="vid-upload"
                      className="font-normal cursor-pointer mb-0"
                    >
                      Upload
                    </FieldLabel>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="url" id="vid-url" />
                    <FieldLabel
                      htmlFor="vid-url"
                      className="font-normal cursor-pointer mb-0"
                    >
                      Link
                    </FieldLabel>
                  </div>
                </RadioGroup>
              </div>
              {videoUpload === "upload" ? (
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                />
              ) : (
                <Input
                  {...form.getInputProps("video.0.url")}
                  placeholder="Enter link"
                />
              )}
            </Field>
          )}
          {!addToShopify && (
            <Field>
              <FieldLabel>Video Tags</FieldLabel>
              <ContainedTagInput
                {...form.getInputProps("video.0.tag")}
                label={undefined}
              />
            </Field>
          )}
        </div>
      )}

      {form.getValues().type === "HOTEL" && (
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!form.errors.hotel_id}>
            <FieldLabel>Hotel ID *</FieldLabel>
            <Input {...form.getInputProps("hotel_id")} />
            <FieldError>{form.errors.hotel_id as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.name}>
            <FieldLabel>Hotel Name *</FieldLabel>
            <Input {...form.getInputProps("name")} />
            <FieldError>{form.errors.name as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.description}>
            <FieldLabel>Description *</FieldLabel>
            <Textarea
              {...form.getInputProps("description")}
              rows={7}
              maxLength={5000}
            />
            <FieldError>{form.errors.description as string}</FieldError>
          </Field>
          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel>Tags</FieldLabel>
              <ContainedTagInput
                {...form.getInputProps("tags")}
                maxTags={5}
                label={undefined}
              />
            </Field>
            <Field>
              <FieldLabel>Number Tags</FieldLabel>
              <ContainedTagInput
                {...form.getInputProps("numbertags")}
                maxTags={5}
                label={undefined}
              />
              <FieldDescription>
                Decimals only — commas not allowed (e.g. 2024)
              </FieldDescription>
            </Field>
          </div>
          <Field>
            <FieldLabel>Address</FieldLabel>
            <Input {...form.getInputProps("address.address")} />
          </Field>
          <Field>
            <FieldLabel>City</FieldLabel>
            <Input {...form.getInputProps("address.city")} />
          </Field>
          <Field data-invalid={!!form.errors.base_price}>
            <FieldLabel>Price *</FieldLabel>
            <Input
              type="number"
              min={0}
              value={form.values.base_price}
              onChange={(e) =>
                form.setFieldValue("base_price", Number(e.target.value))
              }
            />
            <FieldError>{form.errors.base_price as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.currencyCode}>
            <FieldLabel>Currency *</FieldLabel>
            <Select
              value={form.values.currencyCode}
              onValueChange={(v) => form.setFieldValue("currencyCode", v)}
            >
              <SelectTrigger>
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
          <Field>
            <FieldLabel>Image Link</FieldLabel>
            <Input {...form.getInputProps("image.0.url")} />
          </Field>
          <Field>
            <FieldLabel>Image Tags</FieldLabel>
            <ContainedTagInput
              {...form.getInputProps("image.0.tag")}
              label={undefined}
            />
          </Field>
        </div>
      )}

      {form.getValues().type === "HOTEL_ROOM" && (
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!form.errors.hotel_retailer_id}>
            <FieldLabel>Hotel Retailer ID *</FieldLabel>
            <Input {...form.getInputProps("hotel_retailer_id")} />
            <FieldError>{form.errors.hotel_retailer_id as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.hotel_room_id}>
            <FieldLabel>Hotel Room ID *</FieldLabel>
            <Input {...form.getInputProps("hotel_room_id")} />
            <FieldError>{form.errors.hotel_room_id as string}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input {...form.getInputProps("name")} />
          </Field>
          <Field data-invalid={!!form.errors.description}>
            <FieldLabel>Description *</FieldLabel>
            <Textarea
              {...form.getInputProps("description")}
              rows={3}
              maxLength={5000}
            />
            <FieldError>{form.errors.description as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.base_price}>
            <FieldLabel>Price *</FieldLabel>
            <Input
              type="number"
              min={0}
              value={form.values.base_price}
              onChange={(e) =>
                form.setFieldValue("base_price", Number(e.target.value))
              }
            />
            <FieldError>{form.errors.base_price as string}</FieldError>
          </Field>
          <Field data-invalid={!!form.errors.currencyCode}>
            <FieldLabel>Currency *</FieldLabel>
            <Select
              value={form.values.currencyCode}
              onValueChange={(v) => form.setFieldValue("currencyCode", v)}
            >
              <SelectTrigger>
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
          <Field>
            <FieldLabel>Image Link</FieldLabel>
            <Input {...form.getInputProps("image.0.url")} />
          </Field>
          <Field>
            <FieldLabel>Image Tags</FieldLabel>
            <ContainedTagInput
              {...form.getInputProps("image.0.tag")}
              label={undefined}
            />
          </Field>
        </div>
      )}
    </div>
  );
};

export default AddCatalogProduct;

export const AddCatalogProductModal = ({
  catalogData,
  opened,
  close,
  productData = null,
}) => {
  return (
    <Dialog open={opened} onOpenChange={(val) => !val && close()}>
      <DialogContent className="max-w-175 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>
        <AddCatalogProduct
          catalogData={catalogData}
          onCancel={close}
          productData={productData}
        />
      </DialogContent>
    </Dialog>
  );
};
