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
import {
  RateupButtonPrimary,
  RateupButtonBlue,
} from "../../Button/RateupButtons";
import { FontWeights } from "../../Survey/SurveyTheme/fontStyleComponents/FontWeights";
import PaperLayout from "../../styled/Layouts/PaperLayout";

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
      websiteUrl: "",
      logo: "",
      backgroundImage: "",
      menuId: "",
    },
  });

  const [logo, setLogo] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [fontListArray, setFontListArray] = useState<string[]>(fontList || []);
  const [isMenuEnabled, setIsMenuEnabled] = useState<boolean>(
    editingItem?.menuPageEnabled || false,
  );
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState<boolean>(
    editingItem?.feedbackPageEnabled || false,
  );
  const logoRef = useRef<HTMLButtonElement>(null);
  const { isUploading: isBackgroundImageUploading } = useFileUpload(
    backgroundImage,
    "backgroundImage",
    form,
  );
  const { isUploading: isLogoUploading } = useFileUpload(logo, "logo", form);

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
    if (form.isTouched("websiteUrl") || form.isTouched("locationText")) {
      setTabState("other");
      form.setTouched({ websiteUrl: false });
      form.setTouched({ locationText: false });
    }
  }, [form.isTouched]);

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
    menulandingOptionMutation.mutate(checkedValueMenu);
    setIsFeedbackEnabled(event?.currentTarget?.checked);
  };

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 7.5, lg: 8 }} p={"md"}>
        <PaperLayout>
          <Flex p={"sm"}>
            <RateupButtonPrimary title="tablet" />
            <Flex justify={"center"} w={"100%"}>
              <Title order={2}>Preview Screen</Title>
            </Flex>
          </Flex>
          <Stack px={isMobile ? "xs" : "lg"} pb={"lg"} pos={"relative"}>
            <LoadingOverlay
              visible={isBackgroundImageUploading}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
            />
            <BackgroundImage
              src={
                form?.values?.backgroundImage
                  ? getFileUrlFromKey(form?.values?.backgroundImage)
                  : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/background.jpg`
              }
              radius="xl"
            >
              <Group mih={"60vh"} mah={"700"} w={"100%"}>
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
                      />
                    )}
                  </Center>
                  <Flex justify="space-between" px={isMobile ? "xs" : "xl"}>
                    {isMenuEnabled ? (
                      <Stack align="center">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/menu.png`}
                          h={imageHeight}
                          w={imageWidth}
                          maw={"100%"}
                        />
                        <Text c={"white"}>MENU</Text>
                      </Stack>
                    ) : (
                      <Stack h={imageHeight} w={imageWidth}></Stack>
                    )}
                    <Stack gap={0}>
                      <ContainedTextArea
                        placeholder="Welcome to"
                        variant="unstyled"
                        autosize
                        styles={{
                          input: {
                            ...form?.values?.headerStyle,
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
                            border: "none",
                            textAlign: "center",
                          },
                        }}
                        {...form.getInputProps("titleText")}
                      />
                      <Flex c={"white"} justify={"space-between"} columnGap={4}>
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
                          placeholder="Website url"
                          leftSection={<IconWorld size={10} />}
                          variant="unstyled"
                          autosize
                          styles={{
                            input: {
                              ...form?.values?.otherStyle,
                              border: "none",
                            },
                          }}
                          {...form.getInputProps("websiteUrl")}
                        />
                      </Flex>
                    </Stack>
                    {isFeedbackEnabled ? (
                      <Stack align="center">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/feedback.png`}
                          h={imageHeight}
                          w={imageWidth}
                          maw={"100%"}
                        />
                        <Text c={"white"}>FEEDBACK</Text>
                      </Stack>
                    ) : (
                      <Stack h={imageHeight} w={imageWidth}></Stack>
                    )}
                  </Flex>
                </Stack>
              </Group>
              <Center w="100%">
                <Image
                  src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`}
                  h={54}
                  w={94}
                />
              </Center>
            </BackgroundImage>
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
                  placeholder="Click here to upload"
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
                <Tabs
                  value={tabState}
                  onChange={(value: string) => setTabState(value)}
                >
                  <Tabs.List grow>
                    <Tabs.Tab value="header">Header</Tabs.Tab>
                    <Tabs.Tab value="title">Title</Tabs.Tab>
                    <Tabs.Tab value="other">Other</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="header">
                    <ContainedSelection
                      mx={"lg"}
                      mt={"xs"}
                      withAsterisk
                      allowDeselect={false}
                      label=""
                      placeholder="Select font family"
                      required
                      data={fontListArray}
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
                        variant="unstyled"
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
                      data={fontListArray}
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
                        variant="unstyled"
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
                      data={fontListArray}
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
                </Tabs>

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
