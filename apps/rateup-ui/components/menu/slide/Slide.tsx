import { Carousel } from "@mantine/carousel";
import {
  ActionIcon,
  BackgroundImage,
  Box,
  Button,
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
import React, { useState } from "react";
import {
  ContainedTextField,
  ContainedTextArea,
} from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { PriceSection } from "../createMenuItem";
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

export const Slide = ({
  menuId,
  formValues,
  onClose,
  createMenuBannerMutation,
  updateMenuBannerMutation,
  deleteMenuBannerMutation,
  popFromData,
}) => {
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const [selectedTab, setSelectedTab] = useState("Web");
  const [creating, setCreating] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(false);
  const isMobile = selectedTab === "Mobile";
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

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
    if (event) {
      form.setFieldValue("image", URL.createObjectURL(event));
      setImageToUpload(event);
      setImageUploadError(false);
    }
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

  return (
    <>
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
        <SimpleGrid cols={largeScreen ? 2 : 1} mb={"xl"}>
          <Stack>
            <Flex columnGap={30}>
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
            <PriceSection form={form} />
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
                    <Flex style={{ cursor: "pointer" }}>
                      <IconUpload />
                      <FileButton
                        onChange={onChangePicture}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      >
                        {(props) => {
                          return (
                            <Text fz={"xs"} {...props}>
                              Upload Banner Image
                            </Text>
                          );
                        }}
                      </FileButton>
                    </Flex>
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
            e.stopPropagation();
            handleDeleteMutation();
            closeDialog();
          }}
        />
      </form>
    </>
  );
};
