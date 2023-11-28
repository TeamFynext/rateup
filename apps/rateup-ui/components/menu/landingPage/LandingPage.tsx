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
import {
  CatalogueButton,
  FeedbackButton,
  LogoSelectCard,
  MenuButton,
} from "./Button/LandingButtons";
import { TooltipWithEditIcon } from "./Tooltip/TooltipWithEditIcon";
import { lexend, lexend900 } from "../../../utils/fonts";
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
  const [mainTabState, setMainTabState] = useState<string>("bg");
  const [catalogue, setCatalogue] = useState(
    editingItem?.catalogue ? "catalogue" : "menu"
  );
  const menulandingMutation = useMenuLandingMutationById(editingItem?.menuId);
  const menulandingOptionMutation = useUpdateMenuLandingPageOptionById(
    editingItem?.menuId
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
    <Grid ff={lexend.style.fontFamily}>
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
                    radius="0px 0px 22px 22px"
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
                        padding: !isMobileTab ? "0 20px 0 20px" : "0",
                      }}
                    >
                      <div></div>
                      <Stack align="center" gap={0} px={"50px"}>
                        <TooltipWithEditIcon
                          tooltipLabel="change logo"
                          handleEditIcon={(e) => {
                            e.stopPropagation(), setMainTabState("logo");
                          }}
                        >
                          <Image
                            src={
                              form?.values?.logo
                                ? form?.values?.logo?.startsWith("blob")
                                  ? form.values?.logo
                                  : getFileUrlFromKey(form?.values?.logo)
                                : fallbackImage
                            }
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
                                textTransform: "capitalize",
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
                                textTransform: "uppercase",
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
                          h={"120px"}
                          w={"120px"}
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
                          h={"120px"}
                          w={"120px"}
                          mih={80}
                          mx={largeScreen ? "lg" : "0"}
                          selected={isFeedbackEnabled}
                        >
                          {isFeedbackEnabled && FeedbackButton(!isMobileTab)}
                        </PaperLayout>
                      </SimpleGrid>
                    </Center>
                    <Group>
                      <Text
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
                  tabHeading={["bg", "logo", "icon", "text"]}
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
                          !!mobileBackgroundImage
                        )}
                      </Text>
                      <FileButton
                        onChange={onChangePictureMobileBackground}
                        accept="image/png,image/jpeg"
                      >
                        {(props) => (
                          <Button
                            leftSection={<IconUpload size={16} />}
                            size="xs"
                            radius="18px"
                            {...props}
                          >
                            Upload Mobile Image
                          </Button>
                        )}
                      </FileButton>
                      <Text>
                        {getFileNameFromUrl(
                          backgroundImage
                            ? backgroundImage?.name
                            : form?.values?.backgroundImage,
                          !!backgroundImage
                        )}
                      </Text>
                      <FileButton
                        onChange={onChangePictureBackground}
                        accept="image/png,image/jpeg"
                      >
                        {(props) => (
                          <Button
                            leftSection={<IconUpload size={16} />}
                            size="xs"
                            radius="18px"
                            {...props}
                          >
                            Upload Tablet Image
                          </Button>
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
                          !!logo
                        )}
                      </Text>
                      <FileButton
                        onChange={onChangeLogo}
                        accept="image/png,image/jpeg"
                      >
                        {(props) => (
                          <Button
                            leftSection={<IconUpload size={16} />}
                            size="xs"
                            radius="18px"
                            ref={logoRef}
                            {...props}
                          >
                            Upload logo
                          </Button>
                        )}
                      </FileButton>
                    </Stack>
                  </Tabs.Panel>
                  <Tabs.Panel value="icon">
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
                        {/* for future implementation  */}
                        {/* <ContainedSelection
                          mx={"lg"}
                          mt={"xs"}
                          withAsterisk
                          allowDeselect={false}
                          label=""
                          placeholder="Select font family"
                          required
                          data={fontListMenu || []}
                          {...form.getInputProps("headerStyle.fontFamily")}
                        /> */}
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
