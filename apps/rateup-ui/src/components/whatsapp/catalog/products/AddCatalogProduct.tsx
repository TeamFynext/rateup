"use client";

import React, { useEffect, useState } from "react";

import {
  Group,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { toast } from "sonner";

import { CatalogProductType } from "@/types/enums.ts";
import {
  useCreateBatchCatalogProducts,
  useCreateShopifyProduct,
  useUpdateCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons.tsx";
import {
  ContainedFileInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTagInput,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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
        form.setValues(initialValues as never); // Last resort if narrowing fails
      } else {
        form.setInitialValues(getInitialValues(type));
        form.setValues(getInitialValues(type) as never);
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
    <Stack>
      <Group justify="space-between">
        <Group>
          {/* form.getValues().type === CatalogProductType.PRODUCT_ITEM &&
            !productData && (
              <Switch
                label="Add to Shopify"
                description="Create this product in your Shopify store instead of Meta catalog"
                checked={addToShopify}
                onChange={(e) => setAddToShopify(e.currentTarget.checked)}
                color="green"
              />
            ) */}
        </Group>
        <Group>
          <RateupButtonSecondary
            title="Cancel"
            variant="light"
            onClick={cancel}
          />
          <RateupButtonPrimary
            type={"submit"}
            title={addToShopify ? "Add to Shopify" : "Save"}
            onClick={handleSave}
            loading={
              createBatch.isPending ||
              updateProducts.isPending ||
              createShopifyMut.isPending
            }
          />
        </Group>
      </Group>
      <ContainedSelection
        data={Object.values(CatalogProductType)}
        {...form.getInputProps("type")}
        label={"Item Type"}
        disabled
      />
      {form.getValues().type === "PRODUCT_ITEM" && (
        <SimpleGrid cols={2}>
          {!addToShopify && (
            <ContainedTextField
              {...form.getInputProps("retailer_id")}
              label={"Product Retailer ID"}
              required
              withAsterisk
              disabled={!!productData}
            />
          )}
          <ContainedTextField
            {...form.getInputProps("title")}
            label={"Product Title"}
            required
            withAsterisk
          />
          <ContainedTextArea
            {...form.getInputProps("description")}
            label={"Product Description"}
            rows={3}
            minRows={3}
            maxLength={5000}
            required
            withAsterisk
          />
          {!addToShopify && (
            <ContainedTagInput
              {...form.getInputProps("internal_label")}
              maxTags={5}
              label={"Internal Labels"}
            />
          )}
          {!addToShopify && (
            <ContainedSelection
              data={CATALOG_PRODUCT_CONDITIONS}
              {...form.getInputProps("condition")}
              label={"Product Condition"}
              required
              withAsterisk
            />
          )}
          {!addToShopify && (
            <ContainedSelection
              data={CATALOG_PRODUCT_AVAILABILITY}
              {...form.getInputProps("availability")}
              label={"Availability"}
              required
              withAsterisk
            />
          )}
          <ContainedTextField
            {...form.getInputProps("brand")}
            label={"Brand"}
            required
            withAsterisk
          />
          {!addToShopify && (
            <ContainedTextField
              {...form.getInputProps("link")}
              label={"Website Url"}
            />
          )}
          <Group gap={"xs"}>
            <ContainedNumberInput
              allowNegative={false}
              allowLeadingZeros={false}
              {...form.getInputProps("price")}
              label={"Price"}
              w={150}
              required
              withAsterisk
            />
            {!addToShopify && (
              <ContainedNumberInput
                allowNegative={false}
                allowLeadingZeros={false}
                {...form.getInputProps("sale_price")}
                label={"Sale Price"}
                w={150}
                required
                withAsterisk
              />
            )}
          </Group>
          <ContainedSelection
            data={CURRENCY_CODES}
            {...form.getInputProps("currencyCode")}
            label={"currency"}
            required
            withAsterisk
          />
          <Stack gap={2}>
            <Group>
              <Text fw={500}>
                Image{" "}
                <Text fz={10} c={"red"}>
                  (Min Size: 500x500)
                </Text>
              </Text>
              <RadioGroup
                size="xs"
                value={imageUpload}
                onChange={(value) => setImageUpload(value)}
              >
                <Group>
                  <Radio value="upload" size="xs" label="Upload" />
                  <Radio value={"url"} size="xs" label="Link" />
                </Group>
              </RadioGroup>
            </Group>
            {imageUpload === "upload" ? (
              <ContainedFileInput
                placeholder="Choose Image"
                value={image}
                onChange={setImage}
              />
            ) : (
              <ContainedTextField
                {...form.getInputProps("image.0.url")}
                placeholder="Enter link"
              />
            )}
          </Stack>
          {!addToShopify && (
            <ContainedTagInput
              {...form.getInputProps("image.0.tag")}
              label={"Image Tags"}
            />
          )}
          {!addToShopify && (
            <Stack gap={2}>
              <Group gap={"lg"}>
                <Text fw={500}>Video</Text>
                <RadioGroup
                  size="xs"
                  value={videoUpload}
                  onChange={(value) => setVideoUpload(value)}
                >
                  <Group>
                    <Radio size="xs" value="upload" label="Upload" />
                    <Radio size="xs" value={"url"} label="Link" />
                  </Group>
                </RadioGroup>
              </Group>
              {videoUpload === "upload" ? (
                <ContainedFileInput
                  placeholder="Choose video"
                  value={video}
                  onChange={setVideo}
                />
              ) : (
                <ContainedTextField
                  {...form.getInputProps("video.0.url")}
                  placeholder={"Enter Link"}
                />
              )}
            </Stack>
          )}
          {!addToShopify && (
            <ContainedTagInput
              {...form.getInputProps("video.0.tag")}
              label={"Video Tags"}
            />
          )}
        </SimpleGrid>
      )}
      {form.getValues().type === "HOTEL" && (
        <SimpleGrid cols={2}>
          <ContainedTextField
            {...form.getInputProps("hotel_id")}
            label={"Hotel ID"}
            required
            withAsterisk
          />
          <ContainedTextField
            {...form.getInputProps("name")}
            label={"Hotel Name"}
            required
            withAsterisk
          />
          <ContainedTextArea
            {...form.getInputProps("description")}
            label={"Description"}
            rows={7}
            minRows={7}
            maxLength={5000}
            required
            withAsterisk
          />
          <Stack>
            <ContainedTagInput
              {...form.getInputProps("tags")}
              maxTags={5}
              label={"Tags"}
            />
            <ContainedTagInput
              {...form.getInputProps("numbertags")}
              maxTags={5}
              label={"Number Tags"}
              description="decimal, commas are not allowed. Allowed eg:2024"
            />
          </Stack>
          <ContainedTextField
            {...form.getInputProps("address.address")}
            label={"Address"}
          />
          <ContainedTextField
            {...form.getInputProps("address.city")}
            label={"City"}
          />
          <ContainedNumberInput
            allowNegative={false}
            allowLeadingZeros={false}
            {...form.getInputProps("base_price")}
            label={"Price"}
            required
            withAsterisk
          />
          <ContainedSelection
            data={CURRENCY_CODES}
            {...form.getInputProps("currencyCode")}
            label={"currency"}
            required
            withAsterisk
          />
          <ContainedTextField
            {...form.getInputProps("image.0.url")}
            label={"Image link"}
          />
          <ContainedTagInput
            {...form.getInputProps("image.0.tag")}
            label={"Image tags"}
          />
          {/* add location */}
        </SimpleGrid>
      )}
      {form.getValues().type === "HOTEL_ROOM" && (
        <SimpleGrid cols={2}>
          <ContainedTextField
            {...form.getInputProps("hotel_retailer_id")}
            label={"Hotel Retailer ID"}
            required
            withAsterisk
          />
          <ContainedTextField
            {...form.getInputProps("hotel_room_id")}
            label={"Hotel Room ID"}
            required
            withAsterisk
          />
          <ContainedTextField {...form.getInputProps("name")} label={"Name"} />
          <ContainedTextArea
            minRows={3}
            maxLength={5000}
            {...form.getInputProps("description")}
            rows={3}
            label={"Description"}
            required
            withAsterisk
          />
          <ContainedNumberInput
            allowNegative={false}
            allowLeadingZeros={false}
            {...form.getInputProps("base_price")}
            label={"Price"}
            required
            withAsterisk
          />
          <ContainedSelection
            data={CURRENCY_CODES}
            {...form.getInputProps("currencyCode")}
            label={"currency"}
            required
            withAsterisk
          />
          <ContainedTextField
            {...form.getInputProps("image.0.url")}
            label={"Image link"}
          />
          <ContainedTagInput
            {...form.getInputProps("image.0.tag")}
            label={"Image tags"}
          />
        </SimpleGrid>
      )}
    </Stack>
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
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
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
