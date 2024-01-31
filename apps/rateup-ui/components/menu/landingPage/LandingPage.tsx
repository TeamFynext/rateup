import React, { useEffect, useRef, useState } from "react";
import {
  BackgroundImage,
  Button,
  Center,
  Divider,
  FileButton,
  Flex,
  Grid,
  Group,
  Image,
  LoadingOverlay,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconMapPin, IconUpload, IconWorld } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import {
  ContainedColorInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextArea,
} from "../../input/ContainedInput/ContainedInput";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  getImageValue,
  uploadFile,
} from "../../../utils/file-upload/upload";
import {
  useMenuLandingMutationById,
  useUpdateMenuLandingPageOptionById,
} from "../../../backend/menu/LandingPage/landingpage.query";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import TabsCommon from "./Tabs/TabsCommon";
import { showErrorToast } from "../../../utils/notifications";
import {
  CatalogueButton,
  FeedbackButton,
  LogoSelectCard,
  MenuButton,
} from "./Button/LandingButtons";
import { TooltipWithEditIcon } from "./Tooltip/TooltipWithEditIcon";
import { lexend } from "../../../utils/fonts";
import { UnsplashModal } from "../../Modal/UnsplashModal";
import { ImageCropModal } from "../../Modal/ImageCropModal";
import { ImageUploadMethodModal } from "../../Modal/ImageUploadMethodModal";
import {
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
  fallbackImage,
} from "../../../utils/constants";
import { FontWeights } from "../../Survey/SurveyTheme/SurveyTheme.constants";
//TODO: refactor and change to multiple files
const LandingPage = ({ editingItem }: { editingItem: any }) => {
  const largeScreen = useMediaQuery("(min-width: 40em)");

  const form = useForm({
    initialValues: editingItem,
  });

  const [logo, setLogo] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [mobileBackgroundImage, setMobileBackgroundImage] =
    useState<File | null>(null);
  const [isMenuEnabled, setIsMenuEnabled] = useState<boolean>(
    editingItem?.menuPageEnabled ?? true,
  );
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState<boolean>(
    editingItem?.feedbackPageEnabled ?? false,
  );
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const logoRef = useRef<HTMLButtonElement>(null);
  const imageUploadBtnRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef(null);
  const resetLogoRef = useRef(null);

  const [selectedTab, setSelectedTab] = useState("Tablet");
  const [tabState, setTabState] = useState<string>("title");
  const [mainTabState, setMainTabState] = useState<string>("bg");
  const [catalogue, setCatalogue] = useState(
    editingItem?.catalogue ? "catalogue" : "menu",
  );
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [imageType, setImageType] = useState("");
  const [selectedUnslashImage, setSelectedUnslashImage] = useState({
    url: "",
    name: "",
  });
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
  const menulandingMutation = useMenuLandingMutationById(editingItem?.menuId);
  const menulandingOptionMutation = useUpdateMenuLandingPageOptionById(
    editingItem?.menuId,
  );

  useEffect(() => {
    if (form.isTouched("headerText")) {
      setTabState("header");
      setMainTabState("text");
      form.setTouched({ headerText: false });
    }
    if (form.isTouched("titleText")) {
      setTabState("title");
      setMainTabState("text");
      form.setTouched({ titleText: false });
    }
    if (form.isTouched("websiteText") || form.isTouched("locationText")) {
      setTabState("other");
      setMainTabState("text");
      form.setTouched({ websiteText: false });
      form.setTouched({ locationText: false });
    }
  }, [form, form.isTouched]);

  const handleSubmit = async (data: any) => {
    try {
      let imageArray = [];
      let deleteImageArray = [];
      setUpdatingLoading(true);
      backgroundImage && imageArray.push(backgroundImage);
      editingItem?.backgroundImage &&
        backgroundImage &&
        deleteImageArray.push({ Key: editingItem.backgroundImage });

      mobileBackgroundImage && imageArray.push(mobileBackgroundImage);
      editingItem?.mobileBackgroundImage &&
        mobileBackgroundImage &&
        deleteImageArray.push({ Key: editingItem.mobileBackgroundImage });

      logo && imageArray.push(logo);
      editingItem?.logo &&
        logo &&
        deleteImageArray.push({ Key: editingItem.logo });

      let errors = [];
      if (imageArray?.length > 0) {
        const imageResponse = imageArray.map((data) => uploadFile(data));
        if (deleteImageArray?.length > 0) {
          imageResponse.push(
            deleteUploadedFiles({ fileKeyArray: deleteImageArray }),
          );
        }
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
        if (deleteImageArray?.length > 0) {
          successes?.pop();
        }
        if (logo) data.logo = successes.pop();
        if (mobileBackgroundImage) data.mobileBackgroundImage = successes.pop();
        if (backgroundImage) data.backgroundImage = successes.pop();
      }
      menulandingMutation.mutate(data);
      for (const imageUploadError of errors) {
        showErrorToast(imageUploadError.reason);
      }
    } catch (error) {
      setUpdatingLoading(false);
    } finally {
      setUpdatingLoading(false);
      setBackgroundImage(null);
      setMobileBackgroundImage(null);
      setLogo(null);
    }
  };

  const handleMenuEnabledChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const checkedValueMenu = {
      option: {
        menuPageEnabled: event?.currentTarget?.checked,
      },
    };
    menulandingOptionMutation.mutate(checkedValueMenu);
    setIsMenuEnabled(event?.currentTarget?.checked);
  };

  const handleFeedbackEnabledChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const checkedValueMenu = {
      option: {
        feedbackPageEnabled: event?.currentTarget?.checked,
      },
    };
    if (!editingItem?.surveyTeamMapId && !isFeedbackEnabled) {
      showErrorToast(
        "In order to enable feedback, you must have selected a survey in the settings.",
      );
      return;
    }
    menulandingOptionMutation.mutate(checkedValueMenu);
    setIsFeedbackEnabled(event?.currentTarget?.checked);
  };
  const isMobileTab = selectedTab === "Mobile";

  const titleMobile = isMobileTab && {
    fontSize: form?.values?.titleStyle.fontSize * 0.6,
  };
  const headerMobile = isMobileTab && {
    fontSize: form?.values?.headerStyle.fontSize * 0.6,
  };
  const imageKey = isMobileTab ? "mobileBackgroundImage" : "backgroundImage";
  const hasImage = form?.values?.[imageKey];

  let result = "";

  if (hasImage) {
    result = form.values[imageKey]?.startsWith("blob")
      ? form.values[imageKey]
      : encodeURI(getFileUrlFromKey(form.values[imageKey]));
  } else {
    result = `${
      process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL
    }/images/menu/${isMobileTab ? "mobileBackground" : "background"}.jpg`;
  }
  const handlePictureBackground = () => {
    setAspectRatio(8 / 3);
    toggleMethodSelectionDialog();
    setImageType("backgroundImage");
    setSelectedTab("Tablet");
  };
  const handlePictureMobileBackground = () => {
    setAspectRatio(3 / 4);
    toggleMethodSelectionDialog();
    setImageType("mobileBackgroundImage");
    setSelectedTab("Mobile");
  };
  const onChangeLogo = (event: File) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }
    setSelectedUnslashImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    setAspectRatio(4 / 3);
    setImageType("logo");
    resetLogoRef?.current?.();
  };
  const handleCropImageSave = (cropedImage) => {
    if (imageType === "backgroundImage") {
      form?.setFieldValue("backgroundImage", URL.createObjectURL(cropedImage));
      setBackgroundImage(cropedImage);
    } else if (imageType === "mobileBackgroundImage") {
      form?.setFieldValue(
        "mobileBackgroundImage",
        URL.createObjectURL(cropedImage),
      );
      setMobileBackgroundImage(cropedImage);
    } else if (imageType === "logo") {
      form?.setFieldValue("logo", URL.createObjectURL(cropedImage));
      setLogo(cropedImage);
    }
  };
  const handleUnsplashImageSave = (
    unsplashImage: string,
    imageName: string,
  ) => {
    setSelectedUnslashImage({
      url: unsplashImage,
      name: imageName,
    });
    toggleCropDialog();
  };
  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      toggleUnsplashDialog();
    } else {
      imageUploadBtnRef?.current?.click();
    }
  };
  const handleBgPick = (e: File | null) => {
    if (!e) return;
    if (e.size > MAX_FILE_SIZE_IN_BYTE) {
      return showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
    }
    handleUnsplashImageSave(URL.createObjectURL(e), e.name);
    resetRef.current?.();
  };
  return (
    <Grid ff={lexend.style.fontFamily} fw={300}>
      <Grid.Col span={{ base: 12, lg: 8 }} p={"md"}>
        <PaperLayout>
          <>
            <UnsplashModal
              handleUnsplashImageSave={handleUnsplashImageSave}
              opened={openedUnsplashDialog}
              onclose={closeUnsplashDialog}
            />
            <ImageCropModal
              opened={openedCropDialog}
              onclose={closeCropDialog}
              imageName={selectedUnslashImage.name}
              handleCropImageSave={handleCropImageSave}
              image={selectedUnslashImage.url}
              aspect={aspectRatio}
            />
            <ImageUploadMethodModal
              onClose={closeMethodSelectionDialog}
              opened={openedMethodSelectionDialog}
              handleUploadMethod={handleUploadMethod}
            />
            <SimpleGrid p={"sm"} cols={3}>
              <TabsCommon
                tabHeading={["Tablet", "Mobile"]}
                radius={"lg"}
                value={selectedTab}
                onChange={(value) => setSelectedTab(value)}
              >
                <></>
              </TabsCommon>

              <Title order={2} c={"dimmed"}>
                Preview Screen
              </Title>
              <div></div>
            </SimpleGrid>
            <Stack
              px={largeScreen ? "lg" : "xs"}
              pb={"lg"}
              pos={"relative"}
              align="center"
            >
              <LoadingOverlay
                visible={updatingLoading}
                zIndex={1000}
                overlayProps={{ radius: "sm", blur: 2 }}
                loaderProps={{ type: "bars" }}
              />
              <PaperLayout p={0} w={isMobileTab ? 300 : "100%"}>
                <>
                  <BackgroundImage
                    src={result}
                    radius="0rem 0rem 1.375rem 1.375rem"
                    w={isMobileTab && 300}
                    bgsz={"cover"}
                    bgp={"center"}
                    mih={300}
                  >
                    <TooltipWithEditIcon
                      tooltipLabel="Edit Background Image"
                      handleEditIcon={(e) => {
                        e.stopPropagation(), setMainTabState("bg");
                      }}
                    >
                      <></>
                    </TooltipWithEditIcon>
                    <Stack
                      align="center"
                      justify={!isMobileTab ? "space-around" : "center"}
                      h={"100%"}
                      style={{
                        padding: !isMobileTab ? "0 1.25rem 0 1.25rem" : "0",
                      }}
                    >
                      <div></div>
                      <Stack align="center" gap={0} px={"3.125rem"}>
                        <TooltipWithEditIcon
                          tooltipLabel="change logo"
                          handleEditIcon={(e) => {
                            e.stopPropagation(), setMainTabState("logo");
                          }}
                        >
                          <Image
                            src={getImageValue(form?.values?.logo)}
                            onClick={() => {
                              logoRef?.current?.click();
                              setMainTabState("logo");
                            }}
                            h={50}
                            w={50}
                            maw={50}
                            miw={50}
                            mih={50}
                            radius={"md"}
                            fallbackSrc={fallbackImage}
                            alt="image of logo"
                            style={{
                              objectFit: "contain",
                            }}
                          />
                        </TooltipWithEditIcon>
                        <TooltipWithEditIcon
                          tooltipLabel="Edit Header"
                          handleEditIcon={(e) => {
                            e.stopPropagation(), setMainTabState("text");
                          }}
                        >
                          <ContainedTextArea
                            placeholder="Welcome to"
                            variant="unstyled"
                            autosize
                            styles={{
                              input: {
                                ...form?.values?.headerStyle,
                                ...headerMobile,
                                border: "none",
                                textAlign: "center",
                                fontFamily: "inherit",
                              },
                            }}
                            p={0}
                            {...form.getInputProps("headerText")}
                          />
                        </TooltipWithEditIcon>
                        <TooltipWithEditIcon
                          tooltipLabel="Edit Title"
                          handleEditIcon={(e) => {
                            e.stopPropagation(), setMainTabState("text");
                          }}
                        >
                          <ContainedTextArea
                            placeholder="HOTEL NAME"
                            variant="unstyled"
                            autosize
                            styles={{
                              input: {
                                ...form?.values?.titleStyle,
                                ...titleMobile,
                                border: "none",
                                textAlign: "center",
                                fontFamily: "inherit",
                              },
                            }}
                            p={0}
                            {...form.getInputProps("titleText")}
                          />
                        </TooltipWithEditIcon>
                      </Stack>
                      <Center p={0} w={!isMobileTab && "100%"}>
                        <Flex
                          align={!isMobileTab ? "center" : "start"}
                          justify={"space-between"}
                          direction={isMobileTab ? "column" : "row"}
                          w={"100%"}
                          px={!isMobileTab && "100"}
                          pb={"lg"}
                        >
                          <TooltipWithEditIcon
                            tooltipLabel="Edit Website Text"
                            handleEditIcon={(e) => {
                              e.stopPropagation(), setMainTabState("text");
                            }}
                          >
                            <ContainedTextArea
                              placeholder="Website Name"
                              leftSection={
                                <IconWorld
                                  size={
                                    isMobileTab
                                      ? "1.3125rem"
                                      : "clamp(1.313rem, .464rem + 2.262vw, 2.5rem)"
                                  }
                                  color={form?.values?.otherStyle?.color}
                                />
                              }
                              variant="unstyled"
                              autosize
                              styles={{
                                input: {
                                  ...form?.values?.otherStyle,
                                  border: "none",
                                  fontFamily: "inherit",
                                },
                              }}
                              {...form.getInputProps("websiteText")}
                            />
                          </TooltipWithEditIcon>
                          <TooltipWithEditIcon
                            tooltipLabel="Edit Location Name"
                            handleEditIcon={(e) => {
                              e.stopPropagation(), setMainTabState("text");
                            }}
                          >
                            <ContainedTextArea
                              placeholder="location"
                              leftSection={
                                <IconMapPin
                                  size={
                                    isMobileTab
                                      ? "1.3125rem"
                                      : "clamp(1.313rem, .464rem + 2.262vw, 2.5rem)"
                                  }
                                  color={form?.values?.otherStyle?.color}
                                />
                              }
                              variant="unstyled"
                              autosize
                              styles={{
                                input: {
                                  ...form?.values?.otherStyle,
                                  border: "none",
                                  fontFamily: "inherit",
                                },
                              }}
                              tt={"capitalize"}
                              {...form.getInputProps("locationText")}
                            />
                          </TooltipWithEditIcon>
                        </Flex>
                      </Center>
                    </Stack>
                  </BackgroundImage>
                  <Stack
                    align="center"
                    justify={"space-between"}
                    py={"xl"}
                    h={!isMobileTab && "35vh"}
                  >
                    <Center>
                      <SimpleGrid cols={{ base: 1, md: isMobileTab ? 1 : 2 }}>
                        <PaperLayout
                          shadow={isMenuEnabled && "sm"}
                          radius={"md"}
                          p={"lg"}
                          w={"7.5rem"}
                          mih={80}
                          mx={largeScreen ? "lg" : "0"}
                          selected={isMenuEnabled}
                        >
                          {isMenuEnabled && catalogue === "catalogue"
                            ? CatalogueButton(!isMobileTab)
                            : MenuButton(!isMobileTab)}
                        </PaperLayout>
                        <PaperLayout
                          radius={"md"}
                          p={"lg"}
                          w={"7.5rem"}
                          mih={80}
                          mx={largeScreen ? "lg" : "0"}
                          selected={isFeedbackEnabled}
                        >
                          {isFeedbackEnabled && FeedbackButton(!isMobileTab)}
                        </PaperLayout>
                      </SimpleGrid>
                    </Center>
                    <Group justify="center">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup-credits.svg`}
                        w={"clamp(8.5625rem, 4.098rem + 11.905vw, 14.8125rem)"}
                        alt="rate-up logo"
                        mb={"sm"}
                      />
                    </Group>
                  </Stack>
                </>
              </PaperLayout>
            </Stack>
          </>
        </PaperLayout>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 4 }} p="md">
        <Group gap={"md"}>
          <PaperLayout>
            <Group>
              <Switch
                size="xs"
                checked={isMenuEnabled}
                label="Menu Page"
                fw={"600"}
                onChange={handleMenuEnabledChange}
              />
              <Switch
                size="xs"
                checked={isFeedbackEnabled}
                label="Feedback Page"
                fw={"600"}
                onChange={handleFeedbackEnabledChange}
              />
            </Group>
          </PaperLayout>
          <PaperLayout h="100%">
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap={"5"} mx="xs">
                <TabsCommon
                  tabHeading={["bg", "logo", "type", "text"]}
                  value={mainTabState}
                  radius={"xl"}
                  onChange={(value: string) => setMainTabState(value)}
                >
                  <Divider
                    label={`${mainTabState} Settings`}
                    labelPosition="center"
                    tt={"capitalize"}
                    mt="sm"
                    mb="md"
                  />
                  <Tabs.Panel value="bg">
                    <Text mb={"sm"} fz={"lg"} fw={"500"}>
                      Upload background image
                    </Text>
                    <Stack mx={"lg"} mb={"lg"}>
                      <Text>
                        {getFileNameFromUrl(
                          mobileBackgroundImage
                            ? mobileBackgroundImage?.name
                            : form?.values?.mobileBackgroundImage,
                          !!mobileBackgroundImage,
                        )}
                      </Text>
                      <Button
                        leftSection={<IconUpload size={16} />}
                        size="xs"
                        radius="1.125rem"
                        type="button"
                        onClick={handlePictureMobileBackground}
                      >
                        Upload Mobile Image
                      </Button>
                      <Text>
                        {getFileNameFromUrl(
                          backgroundImage
                            ? backgroundImage?.name
                            : form?.values?.backgroundImage,
                          !!backgroundImage,
                        )}
                      </Text>
                      <Button
                        leftSection={<IconUpload size={16} />}
                        size="xs"
                        radius="1.125rem"
                        type="button"
                        onClick={handlePictureBackground}
                      >
                        Upload Tablet Image
                      </Button>
                      <FileButton
                        onChange={handleBgPick}
                        resetRef={resetRef}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      >
                        {(props) => (
                          <Button
                            ref={imageUploadBtnRef}
                            display={"none"}
                            {...props}
                          />
                        )}
                      </FileButton>
                    </Stack>
                  </Tabs.Panel>
                  <Tabs.Panel value="logo">
                    <Text mb={"sm"} fz={"lg"} fw={"500"}>
                      Upload logo
                    </Text>
                    <Stack mx={"lg"} mb={"lg"}>
                      <Text>
                        {getFileNameFromUrl(
                          logo ? logo?.name : form?.values?.logo,
                          !!logo,
                        )}
                      </Text>
                      <FileButton
                        onChange={onChangeLogo}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        resetRef={resetLogoRef}
                      >
                        {(props) => (
                          <Button
                            leftSection={<IconUpload size={16} />}
                            size="xs"
                            radius="1.125rem"
                            ref={logoRef}
                            {...props}
                          >
                            Upload logo
                          </Button>
                        )}
                      </FileButton>
                    </Stack>
                  </Tabs.Panel>
                  <Tabs.Panel value="type">
                    <Text mb={"sm"} fz={"lg"} fw={"500"}>
                      Select Your Icon
                    </Text>
                    <Stack align="center" mb={"lg"}>
                      <LogoSelectCard
                        catalogue={catalogue}
                        setCatalogue={setCatalogue}
                        form={form}
                        type={false}
                      />
                      <LogoSelectCard
                        catalogue={catalogue}
                        setCatalogue={setCatalogue}
                        form={form}
                        type={true}
                      />
                    </Stack>
                  </Tabs.Panel>
                  <Tabs.Panel value="text">
                    <Text mb={"sm"} fz={"lg"} fw={"500"}>
                      Text Settings
                    </Text>
                    <TabsCommon
                      tabHeading={["header", "title", "other"]}
                      value={tabState}
                      radius={"xl"}
                      onChange={(value: string) => setTabState(value)}
                    >
                      <Tabs.Panel value="header">
                        <SimpleGrid mx={"lg"} cols={2}>
                          <ContainedSelection
                            allowDeselect={false}
                            label=" "
                            placeholder="font weight"
                            data={FontWeights}
                            {...form.getInputProps("headerStyle.fontWeight")}
                          />
                          <ContainedNumberInput
                            label="Enter between 0 to 70"
                            placeholder="font size"
                            clampBehavior="strict"
                            min={0}
                            max={70}
                            {...form.getInputProps("headerStyle.fontSize")}
                          />
                          <ContainedColorInput
                            withEyeDropper={false}
                            placeholder="Pick color"
                            label="Your favorite color"
                            {...form.getInputProps("headerStyle.color")}
                          />
                        </SimpleGrid>
                      </Tabs.Panel>
                      <Tabs.Panel value="title">
                        <SimpleGrid mx={"lg"} cols={2}>
                          <ContainedSelection
                            label=" "
                            allowDeselect={false}
                            placeholder="font weight"
                            data={FontWeights}
                            {...form.getInputProps("titleStyle.fontWeight")}
                          />
                          <ContainedNumberInput
                            label="Enter between 0 to 70"
                            placeholder="font size"
                            clampBehavior="strict"
                            min={0}
                            max={70}
                            {...form.getInputProps("titleStyle.fontSize")}
                          />
                          <ContainedColorInput
                            withEyeDropper={false}
                            placeholder="Pick color"
                            label="Your favorite color"
                            {...form.getInputProps("titleStyle.color")}
                          />
                        </SimpleGrid>
                      </Tabs.Panel>
                      <Tabs.Panel value="other">
                        <SimpleGrid mx={"lg"} cols={2}>
                          <ContainedColorInput
                            withEyeDropper={false}
                            placeholder="Pick color"
                            label="Your favorite color"
                            {...form.getInputProps("otherStyle.color")}
                          />
                        </SimpleGrid>
                      </Tabs.Panel>
                    </TabsCommon>
                  </Tabs.Panel>
                </TabsCommon>

                <Center>
                  <RateupButtonBlue
                    type="submit"
                    loading={menulandingMutation?.isPending || updatingLoading}
                    title="Save"
                  />
                </Center>
              </Stack>
            </form>
          </PaperLayout>
        </Group>
      </Grid.Col>
    </Grid>
  );
};

export default LandingPage;

export function getFileNameFromUrl(url: any, isNewFile: boolean) {
  if (isNewFile) return url;
  const pattern = /^[^-]+-/;
  const name = url?.replace(pattern, "");
  return name;
}
