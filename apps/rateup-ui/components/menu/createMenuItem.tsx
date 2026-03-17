"use client";

import { useEffect, useRef, useState } from "react";

import {
  Box,
  Button,
  Center,
  FileButton,
  Flex,
  Group,
  Image,
  LoadingOverlay,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
} from "../../backend/menu/item/mItem.query";
import { MenuItemPriceType } from "../../types/enums";
import {
  fallbackImage,
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
} from "../../utils/constants";
import {
  deleteUploadedFiles,
  getImageValue,
  uploadFile,
} from "../../utils/file-upload/upload";
import { CreditsCard } from "../Card/CreditsCard";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";
import { ImageCropModal } from "../Modal/ImageCropModal";
import { ImageUploadMethodModal } from "../Modal/ImageUploadMethodModal";
import { UnsplashModal } from "../Modal/UnsplashModal";
import { FoodLabelSelector } from "./combobox/foodLabelSelector";
import { PriceSection } from "./item/PriceSection";

interface CreateMenuItemModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly menuId: string;
  readonly categoryId: string;
  readonly editingItem?: MenuItem;
  readonly currency?: string;
}

// If editingItem is passed, then we are editing an existing item
export function CreateMenuItemModal({
  opened,
  close,
  menuId,
  categoryId,
  editingItem,
  currency,
}: CreateMenuItemModalProps) {
  const [imageLoading, setImageLoading] = useState(false);
  const translations = useExtracted();
  const [deleteImageArray, setDeleteImageArray] = useState<
    { Key: string | File | undefined }[]
  >([]);
  const [selectedInputImage, setSelectedInputImage] = useState({
    url: "",
    name: "",
  });
  const resetRef = useRef<() => void>(null);
  const itemImgBtnRef = useRef<HTMLButtonElement>(null);
  const [
    openedUnsplashDialog,
    { toggle: toggleUnsplashDialog, close: closeUnsplashDialog },
  ] = useDisclosure(false);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const [
    openedMethodSelectionDialog,
    { toggle: toggleMethodSelectionDialog, close: closeMethodSelectionDialog },
  ] = useDisclosure(false);

  const form = useForm({
    initialValues: editingItem || {
      name: "",
      categoryId: categoryId,
      images: [],
      videoUrl: "",
      description: "",
      price: {
        price: "",
        variants: [
          {
            name: "",
            price: "",
          },
        ],
        type: MenuItemPriceType.FIXED,
      },
      foodLabels: [],
      unsplashImage: [],
    },
    validate: {
      name: (value) => (value.length ? null : translations("Cannot be empty")),
      description: (value) =>
        value.length ? null : translations("Cannot be empty"),
    },
  });
  const [selectedImage, setSelectedImage] = useState(
    form.values.images[0] || "",
  );

  useEffect(() => {
    if (editingItem) {
      form.setValues(editingItem);
      if (!editingItem.price?.variants) {
        form.setFieldValue("price.variants", [
          {
            name: "",
            price: "",
          },
        ]);
      }
    } else {
      form.reset();
    }
  }, [editingItem]);

  const createMenuItemMutation = useCreateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      form.reset();
    },
  );

  const updateMenuItemMutation = useUpdateMenuItemMutation(
    categoryId,
    menuId,
    () => {
      close();
      form.reset();
    },
  );

  useEffect(() => {
    setSelectedImage(form?.values.images[0] || "");
  }, [form.values.images]);

  const onSubmit = async (values: typeof form.values) => {
    try {
      if (values?.price?.type === MenuItemPriceType.FIXED) {
        delete values?.price?.variants;
      } else {
        delete values?.price?.price;
      }

      const imageArray = values?.images;
      let errors: PromiseRejectedResult[] = [];
      if (editingItem) {
        const newImages: File[] = [];

        for (const image of imageArray) {
          setImageLoading(true);
          if (typeof image !== "string") {
            newImages.push(image);
          }
        }

        if (deleteImageArray?.length > 0) {
          await deleteUploadedFiles({ fileKeyArray: deleteImageArray });
          setDeleteImageArray([]);
        }
        if (newImages?.length > 0) {
          const imageResponse = newImages?.map((data) => uploadFile(data));
          const response = await Promise.allSettled(imageResponse);
          errors = response.filter(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult[];
          const successes = response
            .filter(
              (r): r is PromiseFulfilledResult<string> =>
                r.status === "fulfilled",
            )
            .map((r) => r?.value);
          let i = 0;
          for (const index in imageArray) {
            if (typeof imageArray[index] === "object") {
              imageArray[index] = successes[i];
              i++;
            }
          }
          values.images = imageArray;
        }
        updateMenuItemMutation.mutate({
          menuItemId: editingItem.id,
          menuItem: values,
        });
        setImageLoading(false);
      } else {
        const newImages: File[] = [];
        for (const image of imageArray) {
          setImageLoading(true);
          if (typeof image !== "string") {
            newImages.push(image);
          }
        }
        if (newImages?.length > 0) {
          const imageResponse = imageArray?.map((data) => uploadFile(data));
          const response = await Promise.allSettled(imageResponse);
          errors = response?.filter(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult[];
          const successes = response
            .filter(
              (r): r is PromiseFulfilledResult<string> =>
                r.status === "fulfilled",
            )
            .map((r) => r?.value);

          values.images = successes;
        }
        createMenuItemMutation.mutate(values);
        for (const imageUploadError of errors) {
          toast.error(imageUploadError.reason);
        }
        setImageLoading(false);
      }
      for (const imageUploadError of errors) {
        toast.error(imageUploadError.reason);
      }
    } catch (error) {
      setImageLoading(false);
    } finally {
      form.reset();
      close();
    }
  };

  if (!menuId) {
    return null;
  }
  const imageProps = {
    radius: "md",
    h: 200,
    w: 200,
    fallbackSrc: fallbackImage,
  };
  const onChangePicture = (event: File | null) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(
        `${translations("Max file size is")} ${MAX_FILE_SIZE_IN_MB} MB`,
      );
      return;
    }
    setSelectedInputImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage: File | string) => {
    if (typeof cropedImage === "string") {
      form.setFieldValue("unsplashImage", [
        ...form?.values?.unsplashImage,
        cropedImage,
      ]);
    }
    form.setFieldValue("images", [...form.values.images, cropedImage]);
  };
  const handleUnsplashImageSave = (
    unsplashImage: string,
    imageName: string,
  ) => {
    setSelectedInputImage({
      url: unsplashImage,
      name: imageName,
    });
    toggleCropDialog();
  };
  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      toggleUnsplashDialog();
    } else {
      itemImgBtnRef?.current?.click();
    }
  };
  const handleDeleteImage = () => {
    if (typeof selectedImage !== "object") {
      setDeleteImageArray((prev) => [
        ...prev,
        {
          Key: form?.values?.images?.find((image) => image === selectedImage),
        },
      ]);
    }
    form.removeListItem(
      "images",
      form?.values?.images?.findIndex((image) => image === selectedImage),
    );
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={
        editingItem ? translations("Edit Item") : translations("Create Item")
      }
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={
        editingItem ? translations("Save Item") : translations("Create Item")
      }
      size={"xl"}
    >
      <Flex>
        <UnsplashModal
          handleUnsplashImageSave={handleUnsplashImageSave}
          opened={openedUnsplashDialog}
          onclose={closeUnsplashDialog}
        />
        <ImageUploadMethodModal
          onClose={closeMethodSelectionDialog}
          opened={openedMethodSelectionDialog}
          handleUploadMethod={handleUploadMethod}
        />
        <ImageCropModal
          opened={openedCropDialog}
          onclose={closeCropDialog}
          imageName={selectedInputImage.name}
          handleCropImageSave={handleCropImageSave}
          image={selectedInputImage.url}
          aspect={3 / 2}
        />
        <LoadingOverlay
          visible={
            createMenuItemMutation.isPending ||
            updateMenuItemMutation.isPending ||
            imageLoading
          }
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />
        <Stack style={{ flex: 1 }}>
          <Group mr={"xs"}>
            <Text>{translations("Add Images (max 3)")}</Text>
            {form?.values?.images?.length > 0 ? (
              <Box>
                <CreditsCard
                  enableCredits={
                    form?.values?.unsplashImage?.find(
                      (data) => data === selectedImage,
                    )?.length > 0
                  }
                  url={selectedImage}
                >
                  <Image
                    src={getImageValue(
                      selectedImage,
                      false,
                      form?.values?.unsplashImage?.find(
                        (data) => data === selectedImage,
                      )?.length > 0,
                    )}
                    {...imageProps}
                    alt="image of menu"
                    style={{
                      aspectRatio: 3 / 2,
                    }}
                    w={"100%"}
                  />
                </CreditsCard>
                <Center mt="xs">
                  <Button
                    radius={"xs"}
                    variant="light"
                    color="red"
                    leftSection={<IconTrash />}
                    onClick={handleDeleteImage}
                  >
                    {translations("Delete")}
                  </Button>
                </Center>
              </Box>
            ) : (
              <Image
                src={fallbackImage}
                {...imageProps}
                alt="placholder image of menu"
                style={{
                  aspectRatio: 3 / 2,
                }}
              />
            )}
          </Group>
          <Flex>
            {form.values.images?.map((image: File | string, index) => (
              <Image
                onClick={() => setSelectedImage(image)}
                style={{ borderRadius: "8px", cursor: "pointer" }}
                src={getImageValue(
                  image,
                  false,
                  form?.values?.unsplashImage?.find((data) => data === image)
                    ?.length > 0,
                )}
                h={50}
                miw={70}
                maw={70}
                mr={"md"}
                fallbackSrc={fallbackImage}
                alt="thumbnail image of menu item"
                key={
                  typeof image === "object" && image !== null
                    ? (image as File).name + index
                    : String(image)
                }
              />
            ))}
            {form?.values?.images?.length < 3 && (
              <>
                <FileButton
                  onChange={onChangePicture}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  key={form?.values?.images?.length}
                  resetRef={resetRef}
                >
                  {(props) => (
                    <Button display={"none"} {...props} ref={itemImgBtnRef}>
                      <IconPlus />
                    </Button>
                  )}
                </FileButton>
                <Button
                  color="gray"
                  h={50}
                  w={80}
                  type="button"
                  onClick={toggleMethodSelectionDialog}
                  mr={"md"}
                >
                  <IconPlus />
                </Button>
              </>
            )}
          </Flex>
        </Stack>
        <Stack style={{ flex: 1.5 }} gap={8}>
          <Flex columnGap={30}>
            <ContainedTextField
              label={translations("Name")}
              placeholder={translations("Name")}
              withAsterisk
              {...form.getInputProps("name")}
            />
            <ContainedTextField
              label={translations("Video Url")}
              placeholder={translations("Video Url")}
              {...form.getInputProps("videoUrl")}
            />
          </Flex>
          <ContainedTextArea
            label={translations("Description")}
            placeholder={translations("Description")}
            withAsterisk
            autosize
            minRows={5}
            maxRows={5}
            {...form.getInputProps("description")}
          />
          <PriceSection form={form} currency={currency ?? "0"} />
          <FoodLabelSelector form={form} />
        </Stack>
      </Flex>
    </FormModalLayout>
  );
}
