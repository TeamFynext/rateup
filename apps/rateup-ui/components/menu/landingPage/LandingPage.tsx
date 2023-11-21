import React, { useEffect, useRef, useState } from "react";
import {
  BackgroundImage,
  Center,
  Flex,
  Grid,
  Group,
  Image,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconMapPin, IconWorld } from "@tabler/icons-react";
import { useFileUpload } from "../hook/fileUpload";
import { useForm } from "@mantine/form";
import {
  ContainedColorInput,
  ContainedFileInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextArea,
} from "../../input/ContainedInput/ContainedInput";
import { fontList } from "../../Survey/SurveyTheme/fontStyleComponents/FontList";
import { useMediaQuery } from "@mantine/hooks";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "../../../utils/file-upload/upload";
import {
  useMenuLandingMutationById,
  useUpdateMenuLandingPageOptionById,
} from "../../../backend/menu/LandingPage/landingpage.query";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { FontWeights } from "../../Survey/SurveyTheme/fontStyleComponents/FontWeights";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import TabsCommon from "./Tabs/TabsCommon";
import { showErrorToast } from "../../../utils/notifications";
import { GilroyMedium } from "../../../public/fonts";
import { FeedbackButton, MenuButton } from "./Button/LandingButtons";

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
    editingItem?.menuPageEnabled ?? true
  );
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState<boolean>(
    editingItem?.feedbackPageEnabled ?? false
  );
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const logoRef = useRef<HTMLButtonElement>(null);
  const [selectedTab, setSelectedTab] = useState("Tablet");
  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
  const [tabState, setTabState] = useState<string>("title");
  const menulandingMutation = useMenuLandingMutationById(editingItem?.menuId);
  const menulandingOptionMutation = useUpdateMenuLandingPageOptionById(
    editingItem?.menuId
  );

  useEffect(() => {
    if (form.isTouched("headerText")) {
      setTabState("header");
      form.setTouched({ headerText: false });
    }
    if (form.isTouched("titleText")) {
      setTabState("title");
      form.setTouched({ titleText: false });
    }
    if (form.isTouched("websiteText") || form.isTouched("locationText")) {
      setTabState("other");
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
        deleteImageArray.push({ Key: editingItem.backgroundImage });

      mobileBackgroundImage && imageArray.push(mobileBackgroundImage);
      editingItem?.mobileBackgroundImage &&
        deleteImageArray.push({ Key: editingItem.mobileBackgroundImage });

      logo && imageArray.push(logo);
      editingItem?.logo && deleteImageArray.push({ Key: editingItem.logo });

      let errors = [];
      if (imageArray?.length > 0) {
        const imageResponse = imageArray.map((data) => uploadFile(data));
        if (deleteImageArray?.length > 0) {
          imageResponse.push(
            deleteUploadedFiles({ fileKeyArray: deleteImageArray })
          );
        }
        const response = await Promise.allSettled(imageResponse);
        errors = response.filter(
          (r) => r.status === "rejected"
        ) as PromiseRejectedResult[];
        const successes = response
          .filter(
            (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
          )
          .map((r) => r?.value);
        if (deleteImageArray?.length > 0) {
          successes.pop();
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
    }
  };

  const handleMenuEnabledChange = (
    event: React.ChangeEvent<HTMLInputElement>
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
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checkedValueMenu = {
      option: {
        feedbackPageEnabled: event?.currentTarget?.checked,
      },
    };
    if (!editingItem?.surveyTeamMapId && !isFeedbackEnabled) {
      showErrorToast(
        "In order to enable feedback, you must have selected a survey in the settings."
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
  const onChangePictureBackground = (event: File) => {
    if (event) {
      form.setFieldValue("backgroundImage", URL.createObjectURL(event));
      setBackgroundImage(event);
      setSelectedTab("Tablet");
    }
  };
  const onChangePictureMobileBackground = (event: File) => {
    if (event) {
      form.setFieldValue("mobileBackgroundImage", URL.createObjectURL(event));
      setMobileBackgroundImage(event);
      setSelectedTab("Mobile");
    }
  };
  const onChangeLogo = (event: File) => {
    if (event) {
      form.setFieldValue("logo", URL.createObjectURL(event));
      setLogo(event);
    }
  };
  return (
    <Grid>
      <Grid.Col span={{ base: 12, lg: 8 }} p={"md"}>
        <PaperLayout>
          <>
            <SimpleGrid p={"sm"} cols={3}>
              <TabsCommon
                tabHeading={["Tablet", "Mobile"]}
                radius={"lg"}
                value={selectedTab}
                onChange={(value) => setSelectedTab(value)}
              >
                <></>
              </TabsCommon>
              <Title order={2}>Preview Screen</Title>
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
                    radius="0px 0px 22px 22px"
                    w={isMobileTab && 300}
                    bgsz={"cover"}
                    bgp={"center"}
                    mih={300}
                  >
                    <Stack
                      align="center"
                      justify={!isMobileTab ? "space-around" : "center"}
                      h={"100%"}
                      style={{
                        padding: !isMobileTab ? "0 20px 0 20px" : "0",
                      }}
                    >
                      <div></div>
                      <Stack align="center" gap={0} px={"50px"}>
                        <Image
                          src={
                            form.values?.logo?.startsWith("blob")
                              ? form.values?.logo
                              : getFileUrlFromKey(form?.values?.logo)
                          }
                          onClick={() => logoRef?.current?.click()}
                          h={50}
                          w={50}
                          maw={50}
                          miw={50}
                          mih={50}
                          radius={"md"}
                          fallbackSrc={fallbackImage}
                          alt="image of logo"
                        />
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
                              textTransform: "capitalize",
                            },
                          }}
                          p={0}
                          {...form.getInputProps("headerText")}
                        />
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
                              textTransform: "uppercase",
                            },
                          }}
                          p={0}
                          {...form.getInputProps("titleText")}
                        />
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
                          <ContainedTextArea
                            placeholder="Website Text"
                            leftSection={
                              <IconWorld
                                size={
                                  isMobileTab
                                    ? "21px"
                                    : "clamp(21.008px, 7.424px + 2.262vw, 40px)"
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
                              },
                            }}
                            {...form.getInputProps("websiteText")}
                          />
                          <ContainedTextArea
                            placeholder="location"
                            leftSection={
                              <IconMapPin
                                size={
                                  isMobileTab
                                    ? "21px"
                                    : "clamp(21.008px, 7.424px + 2.262vw, 40px)"
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
                              },
                            }}
                            tt={"capitalize"}
                            {...form.getInputProps("locationText")}
                          />
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
                        <Paper
                          shadow={isMenuEnabled && "sm"}
                          radius={"md"}
                          p={"lg"}
                          mah={"200px"}
                          mih={80}
                          mx={largeScreen ? "lg" : "0"}
                        >
                          {isMenuEnabled && MenuButton(!isMobileTab)}
                        </Paper>
                        <Paper
                          shadow={isFeedbackEnabled && "sm"}
                          radius={"md"}
                          p={"lg"}
                          mah={"200px"}
                          mih={80}
                          mx={largeScreen ? "lg" : "0"}
                        >
                          {isFeedbackEnabled && FeedbackButton(!isMobileTab)}
                        </Paper>
                      </SimpleGrid>
                    </Center>
                    <Group>
                      <Text
                        className={GilroyMedium.className}
                        fz={
                          isMobileTab
                            ? "0.875rem"
                            : "clamp(0.875rem, 0.607rem + 0.714vw, 1.25rem)"
                        }
                      >
                        powered by
                      </Text>
                      <Image
                        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`}
                        h={54}
                        w={94}
                        alt="rate-up logo"
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
                onChange={handleMenuEnabledChange}
              />
              <Switch
                size="xs"
                checked={isFeedbackEnabled}
                label="Feedback Page"
                onChange={handleFeedbackEnabledChange}
              />
            </Group>
          </PaperLayout>
          <PaperLayout h="100%">
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Title order={2}>Background Settings</Title>
              <Stack gap={"5"} mx="xs">
                <Text mt={"xs"}>Upload background image</Text>
                <ContainedFileInput
                  mx={"lg"}
                  label=""
                  placeholder="Upload Mobile Image"
                  accept="image/*"
                  multiple={false}
                  error={form?.errors?.mobileBackgroundImage}
                  maw={285}
                  onChange={onChangePictureMobileBackground}
                />
                <ContainedFileInput
                  mx={"lg"}
                  label=""
                  placeholder="Upload Tablet Images"
                  accept="image/*"
                  multiple={false}
                  error={form?.errors?.backgroundImage}
                  maw={285}
                  onChange={onChangePictureBackground}
                />
                <Text mt={"xs"}>Upload logo</Text>

                <ContainedFileInput
                  mx={"lg"}
                  label=""
                  placeholder="Click here to upload"
                  accept="image/*"
                  multiple={false}
                  error={form?.errors?.logo}
                  onChange={onChangeLogo}
                  maw={285}
                  ref={logoRef}
                />

                <Text mt={"xs"}>Text Settings</Text>
                <TabsCommon
                  tabHeading={["header", "title", "other"]}
                  value={tabState}
                  radius={"xl"}
                  onChange={(value: string) => setTabState(value)}
                >
                  <Tabs.Panel value="header">
                    <ContainedSelection
                      mx={"lg"}
                      mt={"xs"}
                      withAsterisk
                      allowDeselect={false}
                      label=""
                      placeholder="Select font family"
                      required
                      data={fontList || []}
                      {...form.getInputProps("headerStyle.fontFamily")}
                    />
                    <SimpleGrid mx={"lg"} cols={2}>
                      <ContainedSelection
                        mt={"lg"}
                        withAsterisk
                        allowDeselect={false}
                        label=""
                        placeholder="font weight"
                        required
                        data={FontWeights}
                        {...form.getInputProps("headerStyle.fontWeight")}
                      />
                      <ContainedNumberInput
                        withAsterisk
                        label="Enter between 0 to 70"
                        placeholder="font size"
                        required
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
                    <ContainedSelection
                      mx={"lg"}
                      mt={"xs"}
                      withAsterisk
                      label=""
                      allowDeselect={false}
                      placeholder="Select font family"
                      required
                      data={fontList || []}
                      {...form.getInputProps("titleStyle.fontFamily")}
                    />
                    <SimpleGrid mx={"lg"} cols={2}>
                      <ContainedSelection
                        mt={"lg"}
                        withAsterisk
                        label=""
                        allowDeselect={false}
                        placeholder="font weight"
                        required
                        data={FontWeights}
                        {...form.getInputProps("titleStyle.fontWeight")}
                      />
                      <ContainedNumberInput
                        withAsterisk
                        label="Enter between 0 to 70"
                        placeholder="font size"
                        required
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
                    <ContainedSelection
                      mx={"lg"}
                      mt={"xs"}
                      withAsterisk
                      label=""
                      allowDeselect={false}
                      placeholder="Select font family"
                      required
                      data={fontList || []}
                      {...form.getInputProps("otherStyle.fontFamily")}
                    />
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
