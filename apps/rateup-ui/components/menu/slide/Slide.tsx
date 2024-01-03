import {
  ActionIcon,
  BackgroundImage,
  Box,
  Center,
  FileButton,
  Flex,
  Group,
  LoadingOverlay,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconUpload, IconMenu2, IconTrash } from "@tabler/icons-react";
import React, { useEffect, useRef, useState } from "react";
import {
  ContainedTextField,
  ContainedTextArea,
} from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { PriceSection } from "../item/PriceSection";
import TabsCommon from "../landingPage/Tabs/TabsCommon";
import { SkeletonMenuCard } from "../skeleton/SkeletonMenuCard";
import { useForm } from "@mantine/form";
import { MenuItemPriceType } from "../../../types/enums";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "../../../utils/file-upload/upload";
import { notifications } from "@mantine/notifications";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import { ImageCropModal } from "../../Modal/ImageCropModal";
import {
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
} from "../../../utils/constants";
import { showErrorToast } from "../../../utils/notifications";

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
    },
    validate: {
      name: (value) => (value.length ? null : "Cannot be empty"),
      description: (value) => (value.length ? null : "Cannot be empty"),
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
      showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
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
      notifications.show({
        id: "menu-banner-delete",
        loading: true,
        title: "Deleting Menu Banner..",
        message: `Hold on, Your Menu Banner Is Getting Deleted.`,
        autoClose: false,
        withCloseButton: false,
      });
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
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <SimpleGrid cols={largeScreen ? 2 : 1}>
          <Stack>
            <Flex columnGap={30} rowGap={0}>
              <ContainedTextField
                label="Name"
                placeholder="Name"
                withAsterisk
                {...form.getInputProps("name")}
              />
              <ContainedTextField
                label="Video Url"
                placeholder="Video Url"
                {...form.getInputProps("videoUrl")}
              />
            </Flex>
            <ContainedTextArea
              label="Description"
              placeholder="Description"
              withAsterisk
              autosize
              minRows={5}
              {...form.getInputProps("description")}
            />
            <PriceSection form={form} currency={currency ?? "0"} />
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
                                  ? "Change Banner Image"
                                  : "Upload Banner Image"}
                              </Text>
                            );
                          }}
                        </FileButton>
                      </Flex>
                      {!form?.values?.image && (
                        <Text c={"var(--grey-color-4)"} fz={10}>
                          Width : 1980 X Height: 312
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
                        <Box
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

                  <Box
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
          <RateupButtonSecondary
            color="var(--tertiary-color)"
            loading={
              createMenuBannerMutation?.isPending ||
              updateMenuBannerMutation?.isPending
            }
            type="reset"
            variant="subtle"
            onClick={onClose}
            title={"Cancel"}
          />
          <RateupButtonBlue
            color="var(--tertiary-color)"
            loading={
              createMenuBannerMutation?.isPending ||
              updateMenuBannerMutation?.isPending
            }
            type="submit"
            title="save"
          />
        </Group>
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel="Are you sure to delete this Menu Banner?"
          headerTitle="Delete Menu Banner?"
          confirmLabel="Delete"
          onConfirm={(e) => {
            handleDeleteMutation();
            closeDialog();
          }}
        />
      </form>
    </>
  );
};
