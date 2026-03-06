"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  BackgroundImage,
  Center,
  FileButton,
  Flex,
  Group,
  LoadingOverlay,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconMenu2, IconTrash, IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { MenuItemPriceType } from "@/types/enums";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { ImageCropModal } from "@/components/Modal/ImageCropModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import {
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
  SAVE_HOTKEY,
} from "@/utils/constants";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "@/utils/file-upload/upload";

import { FoodLabelSelector } from "../combobox/foodLabelSelector";
import { PriceSection } from "../item/PriceSection";
import TabsCommon from "../landingPage/Tabs/TabsCommon";
import { SkeletonMenuCard } from "../skeleton/SkeletonMenuCard";

export const Slide = ({
  menuId,
  formValues,
  onClose,
  createMenuBannerMutation,
  updateMenuBannerMutation,
  deleteMenuBannerMutation,
  popFromData,
  currency,
}) => {
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const [selectedTab, setSelectedTab] = useState("Web");
  const [creating, setCreating] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(false);
  const isMobile = selectedTab === "Mobile";
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const resetRef = useRef(null);
  const translations = useTranslations();
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const form = useForm({
    initialValues: formValues || {
      id: "",
      name: "",
      menuId: menuId,
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
    },
    validate: {
      name: (value) => (value.length ? null : translations("Cannot be empty")),
      description: (value) =>
        value.length ? null : translations("Cannot be empty"),
    },
  });

  useEffect(() => {
    if (formValues?.price?.type === "FIXED") {
      form?.setFieldValue("price", {
        price: formValues?.price?.price,
        variants: [
          {
            name: "",
            price: "",
          },
        ],
        type: MenuItemPriceType.FIXED,
      });
    }
  }, [formValues]);

  const handleSubmit = async (data) => {
    try {
      if (!imageToUpload && !formValues?.image) {
        setImageUploadError(true);
        return;
      }
      setCreating(true);
      let temp = "";
      if (imageToUpload) {
        const fileKey = await uploadFile(imageToUpload);
        if (typeof fileKey === "string") {
          temp = fileKey;
        }
      }
      if (data?.price?.type === MenuItemPriceType.FIXED) {
        delete data?.price?.variants;
      } else {
        delete data?.price?.price;
      }
      if (data?.id) {
        if (formValues?.image && formValues?.image !== data?.image) {
          await deleteUploadedFiles({
            fileKeyArray: [{ Key: formValues?.image }],
          });
          data.image = temp;
        }

        updateMenuBannerMutation.mutate({ id: data?.id, data: data });
      } else {
        if (imageToUpload) {
          data.image = temp;
        }
        createMenuBannerMutation.mutate(data);
      }
      setImageToUpload(null);
    } catch (error) {
    } finally {
      setCreating(false);
      setImageToUpload(null);
    }
  };

  const onChangePicture = (event: File) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(
        `${translations("Max file size is")} ${MAX_FILE_SIZE_IN_MB} MB`,
      );
      return;
    }
    setSelectedImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };

  const handleDeleteMutation = () => {
    if (formValues?.id) {
      toast.loading(
        translations("Hold on, Your Menu Banner Is Getting Deleted"),
        {
          id: "menu-banner-delete",
        },
      );
      deleteMenuBannerMutation.mutate(formValues?.id);
    } else {
      closeDialog();
      popFromData();
    }
  };
  const handleCropImageSave = (cropedImage) => {
    form.setFieldValue("image", URL.createObjectURL(cropedImage));
    setImageToUpload(cropedImage);
    setImageUploadError(false);
  };
  return (
    <>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={16 / 9}
      />
      <LoadingOverlay
        visible={
          createMenuBannerMutation.isPending ||
          updateMenuBannerMutation.isPending ||
          creating
        }
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
        loaderProps={{ type: "bars" }}
      />
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
        ])}
      >
        <SimpleGrid cols={largeScreen ? 2 : 1}>
          <Stack>
            <Flex columnGap={30} rowGap={0}>
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
              {...form.getInputProps("description")}
            />
            <PriceSection form={form} currency={currency ?? "0"} />
            <FoodLabelSelector form={form} />
          </Stack>
          <Stack align="center">
            <Group w={"100%"} justify="space-between" gap={0}>
              <Stack></Stack>
              <TabsCommon
                tabHeading={["Web", "Mobile"]}
                radius={"lg"}
                value={selectedTab}
                onChange={(value) => setSelectedTab(value)}
              >
                <></>
              </TabsCommon>
              <ActionIcon onClick={toggle} variant="transparent">
                <IconTrash />
              </ActionIcon>
            </Group>
            <PaperLayout p={0} w={isMobile ? "185px" : "100%"}>
              <>
                {imageUploadError && <Text c={"red"}>*Image is Required</Text>}
                <BackgroundImage
                  h={110}
                  w={"100%"}
                  style={{
                    backgroundColor: "var(--light-grey-color-2)",
                    borderRadius: "3px",
                  }}
                  src={
                    form.values?.image?.startsWith("blob")
                      ? form.values.image
                      : getFileUrlFromKey(form.values?.image)
                  }
                >
                  <Center h="100%">
                    <Stack gap={0} align="center">
                      <Flex
                        style={{ cursor: "pointer", borderRadius: "7px" }}
                        bg={form?.values?.image && "var(--light-dark-color-2)"}
                        c={form?.values?.image && "white"}
                        p={5}
                        columnGap={5}
                      >
                        <IconUpload size={"16px"} />
                        <FileButton
                          onChange={onChangePicture}
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          resetRef={resetRef}
                        >
                          {(props) => {
                            return (
                              <Text fz={"xs"} {...props}>
                                {form?.values?.image
                                  ? translations("Change Banner Image")
                                  : translations("Upload Banner Image")}
                              </Text>
                            );
                          }}
                        </FileButton>
                      </Flex>
                      {!form?.values?.image && (
                        <Text c={"var(--grey-color-4)"} fz={10}>
                          {translations("Width : 1980 X Height: 312")}
                        </Text>
                      )}
                    </Stack>
                  </Center>
                </BackgroundImage>
                <Stack p={"md"}>
                  <Group gap={isMobile && "3px"}>
                    <IconMenu2 stroke={1} height={12} width={14} />
                    {Array(3)
                      .fill(0)
                      .map((_, index) => (
                        <Skeleton
                          h={13}
                          w={!isMobile && 50}
                          key={index}
                          style={{
                            flex: isMobile ? 1 : undefined,
                            backgroundColor: "var(--light-grey-color-2)",
                            borderRadius: "3px",
                          }}
                        />
                      ))}
                  </Group>

                  <Skeleton
                    h={9}
                    w={57}
                    style={{
                      backgroundColor: "var(--light-grey-color-2)",
                      borderRadius: "3px",
                    }}
                  />
                  <SimpleGrid
                    cols={isMobile ? 1 : 3}
                    spacing={isMobile && "5px"}
                  >
                    {Array(isMobile ? 3 : 6)
                      .fill(0)
                      .map((_, index) => (
                        <SkeletonMenuCard isMobile={isMobile} key={index} />
                      ))}
                  </SimpleGrid>
                </Stack>
              </>
            </PaperLayout>
          </Stack>
        </SimpleGrid>
        <Group justify="flex-end">
          <RateupButtonPrimary
            loading={
              createMenuBannerMutation?.isPending ||
              updateMenuBannerMutation?.isPending
            }
            type="reset"
            variant="subtle"
            onClick={onClose}
            title={"Cancel"}
          />
          <RateupButtonPrimary
            loading={
              createMenuBannerMutation?.isPending ||
              updateMenuBannerMutation?.isPending
            }
            type="submit"
            title={translations("save")}
          />
        </Group>
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel={translations("Are you sure to delete this Menu Banner?")}
          headerTitle={translations("Delete Menu Banner?")}
          confirmLabel={translations("Delete")}
          onConfirm={(e) => {
            handleDeleteMutation();
            closeDialog();
          }}
        />
      </form>
    </>
  );
};
