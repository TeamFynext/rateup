"use client";

import React, { useEffect, useState } from "react";

import {
  FileInput,
  Group,
  Modal,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
} from "@mantine/core";
import { isInRange, isNotEmpty, useForm } from "@mantine/form";
import { IconCheck, IconX } from "@tabler/icons-react";

import { CatalogProductType } from "@/types/enums";
import {
  useCreateBatchCatalogProducts,
  useUpdateCatalogProducts,
} from "@/backend/whatsapp/catalog/products/products.query";
import {
  RateupButtonOutline,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedFileInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTagInput,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import {
  CATALOG_PRODUCT_AVAILABILITY,
  CATALOG_PRODUCT_CONDITIONS,
  CATALOG_PRODUCT_TYPES,
  CURRENCY_CODES,
} from "@/utils/constants";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";
import { showErrorToastFromError } from "@/utils/query";

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
        let initialValues = getInitialValues(type);
        Object.keys(getInitialValues(type)).map((key) => {
          initialValues[key] = productData[key];
        });
        form.setInitialValues(initialValues);
        form.setValues(initialValues);
      } else {
        form.setInitialValues(getInitialValues(type));
        form.setValues(getInitialValues(type));
      }
    }
  }, [catalogData, productData]);

  const createBatch = useCreateBatchCatalogProducts(catalogData?.catalogId);
  const updateProducts = useUpdateCatalogProducts(catalogData?.catalogId);

  const [imageUpload, setImageUpload] = useState("upload");
  const [image, setImage] = useState(null);
  const [videoUpload, setVideoUpload] = useState("upload");
  const [video, setVideo] = useState(null);

  async function handleSave() {
    if (form.validate().hasErrors) return;
    let loadinggMessage = productData
      ? "Updating Product"
      : "Uploading product..";
    showLoadingToast(
      loadinggMessage,
      "catalog-product",
      true,
      "Uploading",
      "",
      false,
    );
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
          showSuccessToast(
            "Prodcut Updated",
            "catalog-product",
            <IconCheck />,
            true,
          );
          cancel();
        },
        onError: () => {
          showErrorToast(
            "Product updation failed",
            "catalog-product",
            <IconX />,
            true,
          );
        },
      });
      return;
    }
    createBatch.mutate(data, {
      onSuccess: () => {
        showSuccessToast(
          "Prodcut Uploaded",
          "catalog-product",
          <IconCheck />,
          true,
        );
        cancel();
      },
      onError: () => {
        showErrorToast("Product failed", "catalog-product", <IconX />, true);
      },
    });
  }

  function cancel() {
    form.reset();
    onCancel();
  }
  return (
    <Stack>
      <Group justify="flex-end">
        <RateupButtonSecondary
          title="Cancel"
          variant="light"
          onClick={cancel}
        />
        <RateupButtonPrimary
          type={"submit"}
          title="Save"
          onClick={handleSave}
          loading={createBatch.isPending || updateProducts.isPending}
        />
      </Group>
      <ContainedSelection
        data={Object.values(CatalogProductType)}
        {...form.getInputProps("type")}
        label={"Item Type"}
        disabled
      />
      {form.getValues().type === "PRODUCT_ITEM" && (
        <SimpleGrid cols={2}>
          <ContainedTextField
            {...form.getInputProps("retailer_id")}
            label={"Product Retailer ID"}
            required
            withAsterisk
            disabled={!!productData}
          />
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
          <ContainedTagInput
            {...form.getInputProps("internal_label")}
            maxTags={5}
            label={"Internal Labels"}
          />
          <ContainedSelection
            data={CATALOG_PRODUCT_CONDITIONS}
            {...form.getInputProps("condition")}
            label={"Product Condition"}
            required
            withAsterisk
          />
          <ContainedSelection
            data={CATALOG_PRODUCT_AVAILABILITY}
            {...form.getInputProps("availability")}
            label={"Availability"}
            required
            withAsterisk
          />
          <ContainedTextField
            {...form.getInputProps("brand")}
            label={"Brand"}
            required
            withAsterisk
          />
          <ContainedTextField
            {...form.getInputProps("link")}
            label={"Website Url"}
          />
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
            <ContainedNumberInput
              allowNegative={false}
              allowLeadingZeros={false}
              {...form.getInputProps("sale_price")}
              label={"Sale Price"}
              w={150}
              required
              withAsterisk
            />
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
                onChange={setImageUpload}
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
          <ContainedTagInput
            {...form.getInputProps("image.0.tag")}
            label={"Image Tags"}
          />
          <Stack gap={2}>
            <Group gap={"lg"}>
              <Text fw={500}>Video</Text>
              <RadioGroup
                size="xs"
                value={videoUpload}
                onChange={setVideoUpload}
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
          <ContainedTagInput
            {...form.getInputProps("video.0.tag")}
            label={"Video Tags"}
          />
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
    <Modal
      opened={opened}
      title="Add Item"
      onClose={close}
      size={"xl"}
      centered
    >
      <AddCatalogProduct
        catalogData={catalogData}
        onCancel={close}
        productData={productData}
      />
    </Modal>
  );
};
