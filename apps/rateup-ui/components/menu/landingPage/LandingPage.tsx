import React, { useEffect, useRef, useState } from "react";
import {
  BackgroundImage,
  Center,
  Flex,
  Grid,
  Group,
  Image,
  LoadingOverlay,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
  em,
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
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import {
  useMenuLandingMutationById,
  useUpdateMenuLandingPageOptionById,
} from "../../../backend/menu/LandingPage/landingpage.query";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { FontWeights } from "../../Survey/SurveyTheme/fontStyleComponents/FontWeights";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import TabsCommon from "./Tabs/TabsCommon";
import { showErrorToast } from "../../../utils/notifications";

const LandingPage = ({ editingItem }: { editingItem: any }) => {
  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);
  const form = useForm({
    initialValues: editingItem || {
      headerStyle: {
        fontFamily: "Roboto",
        fontWeight: "400",
        fontSize: 18,
        color: "#ffffff",
      },
      titleStyle: {
        fontFamily: "Roboto",
        fontWeight: "700",
        fontSize: isMobile ? 26 : 32,
        color: "#ffffff",
      },
      otherStyle: {
        fontFamily: "Roboto",
        color: "#ffffff",
      },
      headerText: "Welcome To",
      titleText: "HOTEL NAME",
      locationText: "",
      websiteText: "",
      logo: "",
      backgroundImage: "",
      mobileBackgroundImage: "",
      menuId: "",
    },
  });

  const [logo, setLogo] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [mobileBackgroundImage, setMobileBackgroundImage] =
    useState<File | null>(null);
  const [isMenuEnabled, setIsMenuEnabled] = useState<boolean>(
    editingItem?.menuPageEnabled ?? true,
  );
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState<boolean>(
    editingItem?.feedbackPageEnabled ?? false
  );
  const logoRef = useRef<HTMLButtonElement>(null);
  const { isUploading: isBackgroundImageUploading } = useFileUpload(
    backgroundImage,
    "backgroundImage",
    form,
  );
  const { isUploading: isLogoUploading } = useFileUpload(logo, "logo", form);
  const { isUploading: isMobileBgUploading } = useFileUpload(
    mobileBackgroundImage,
    "mobileBackgroundImage",
    form,
  );

  const [selectedTab, setSelectedTab] = useState("Tablet");
  const imageWidth = useMediaQuery(`(max-width: ${em(750)})`) ? 60 : 127;
  const imageHeight = useMediaQuery(`(max-width: ${em(750)})`) ? 60 : 127;
  const fallbackImage = "/images/no_image_template.jpeg";
  const [tabState, setTabState] = useState<string>("title");
  const menulandingMutation = useMenuLandingMutationById(editingItem?.menuId);
  const menulandingOptionMutation = useUpdateMenuLandingPageOptionById(
    editingItem?.menuId,
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

  const handleSubmit = (data: any) => {
    menulandingMutation.mutate(data);
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
    if (!editingItem?.surveyId && !isFeedbackEnabled) {
      showErrorToast(
        "In order to enable feedback, you must have selected a survey in the settings."
      );
      return;
    }
    menulandingOptionMutation.mutate(checkedValueMenu);
    setIsFeedbackEnabled(event?.currentTarget?.checked);
  };
  const titleMobile = selectedTab === "Mobile" && {
    fontSize: form?.values?.titleStyle.fontSize * 0.6,
  };
  const headerMobile = selectedTab === "Mobile" && {
    fontSize: form?.values?.headerStyle.fontSize * 0.6,
  };
  let backgroundImageSrc = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/background.jpg`;
  let mobileBackgroundImageSrc = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/mobileBackground.jpg`;

  if (form?.values?.backgroundImage) {
    backgroundImageSrc = getFileUrlFromKey(form.values.backgroundImage);
  }

  if (form?.values?.mobileBackgroundImage) {
    mobileBackgroundImageSrc = getFileUrlFromKey(
      form.values.mobileBackgroundImage
    );
  }
  const renderFeedbackComponent = () => {
    if (isFeedbackEnabled) {
      return (
        <Stack align="center" gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/feedback.png`}
            h={"auto"}
            w={selectedTab == "Mobile" ? "50px" : imageWidth}
            maw={"100%"}
            alt="icon of feedbak"
          />
          <Text c={"black"}>FEEDBACK</Text>
        </Stack>
      );
    } else {
      return <Stack h={imageHeight} w={imageWidth}></Stack>;
    }
  };
  const renderMenuComponent = () => {
    if (isMenuEnabled) {
      return (
        <Stack align="center" gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/menu.png`}
            w={selectedTab == "Mobile" ? "50px" : imageWidth}
            maw={"100%"}
            alt="icon of menu"
          />
          <Text c={"black"}>MENU</Text>
        </Stack>
      );
    } else {
      return <Stack h={imageHeight} w={imageWidth}></Stack>;
    }
  };
  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 7.5, lg: 8 }} p={"md"}>
        <PaperLayout>
          <SimpleGrid p={"sm"} cols={3}>
            <TabsCommon
              tabHeading={["Tablet", "Mobile"]}
              radius={"lg"}
              value={selectedTab}
              onChange={(value) => setSelectedTab(value)}
            >
              {}
            </TabsCommon>
            <Title order={2}>Preview Screen</Title>
            <div></div>
          </SimpleGrid>
          <Stack
            px={isMobile ? "xs" : "lg"}
            pb={"lg"}
            pos={"relative"}
            align="center"
          >
            <LoadingOverlay
              visible={isBackgroundImageUploading || isMobileBgUploading}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
            />
            <PaperLayout p={0} w={selectedTab === "Mobile" && 300}>
              <BackgroundImage
                src={
                  selectedTab === "Mobile"
                    ? form?.values?.mobileBackgroundImage
                      ? getFileUrlFromKey(form?.values?.mobileBackgroundImage)
                      : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/mobileBackground.jpg`
                    : form?.values?.backgroundImage
                    ? getFileUrlFromKey(form?.values?.backgroundImage)
                    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/background.jpg`
                }
                radius="xl"
                w={selectedTab === "Mobile" && 300}
              >
                <Group
                  mih={selectedTab === "Mobile" ? "70vh" : "60vh"}
                  mah={"700"}
                  w={"100%"}
                >
                  <Stack w={"100%"}>
                    <Center>
                      {isLogoUploading ? (
                        <Skeleton w={50} h={50} />
                      ) : (
                        <Image
                          src={
                            form?.values?.logo &&
                            getFileUrlFromKey(form?.values?.logo)
                          }
                          onClick={() => logoRef?.current?.click()}
                          h={50}
                          w={50}
                          maw={50}
                          radius={"md"}
                          fallbackSrc={fallbackImage}
                          alt="image of logo"
                        />
                      )}
                    </Center>
                    <Flex
                      justify="space-between"
                      px={isMobile || selectedTab == "Mobile" ? "xs" : "xl"}
                    >
                      {selectedTab !== "Mobile" && renderMenuComponent()}
                      <Stack gap={0}>
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
                            },
                          }}
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
                            },
                          }}
                          {...form.getInputProps("titleText")}
                        />
                        <Flex
                          c={"black"}
                          justify={"center"}
                          align={"center"}
                          columnGap={4}
                          direction={
                            selectedTab === "Mobile" ? "column" : "row"
                          }
                        >
                          <ContainedTextArea
                            placeholder="location"
                            leftSection={<IconMapPin size={10} />}
                            variant="unstyled"
                            autosize
                            styles={{
                              input: {
                                ...form?.values?.otherStyle,
                                border: "none",
                              },
                            }}
                            {...form.getInputProps("locationText")}
                          />
                          <ContainedTextArea
                            placeholder="Website Text"
                            leftSection={<IconWorld size={10} />}
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
                        </Flex>
                      </Stack>
                      {selectedTab !== "Mobile" && renderFeedbackComponent()}
                    </Flex>
                    {selectedTab == "Mobile" && (
                      <Stack justify="center">
                        {renderMenuComponent()}
                        {renderFeedbackComponent()}
                      </Stack>
                    )}
                  </Stack>
                </Group>
                <Center w="100%">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`}
                    h={54}
                    w={94}
                    alt="logo company"
                  />
                </Center>
              </BackgroundImage>
            </PaperLayout>
          </Stack>
        </PaperLayout>
      </Grid.Col>
      <Grid.Col span={"auto"} p="md">
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
          <PaperLayout height="100%">
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
                  onChange={setMobileBackgroundImage}
                />
                <ContainedFileInput
                  mx={"lg"}
                  label=""
                  placeholder="Upload Tablet Image"
                  accept="image/*"
                  multiple={false}
                  error={form?.errors?.backgroundImage}
                  onChange={setBackgroundImage}
                />
                <Text mt={"xs"}>Upload logo</Text>

                <ContainedFileInput
                  mx={"lg"}
                  label=""
                  placeholder="Click here to upload"
                  accept="image/*"
                  multiple={false}
                  error={form?.errors?.logo}
                  onChange={setLogo}
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
                        label="Enter between 0 to 60"
                        placeholder="font size"
                        required
                        clampBehavior="strict"
                        min={0}
                        max={80}
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
                        label="Enter between 0 to 60"
                        placeholder="font size"
                        required
                        clampBehavior="strict"
                        min={0}
                        max={80}
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
                    loading={menulandingMutation?.isPending}
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
