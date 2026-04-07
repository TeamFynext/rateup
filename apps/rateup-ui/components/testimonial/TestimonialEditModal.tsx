"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Box,
  Checkbox,
  CheckIcon,
  Flex,
  Grid,
  Group,
  Modal,
  Radio,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useExtracted } from "next-intl";
import { useImmer } from "use-immer";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import { useUpdateCollection } from "../../backend/testimonials/testimonial.query";
import { Testimonial, TestimonialStyleType } from "../../types/global";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import {
  ContainedColorInput,
  ContainedNumberInput,
  ContainedSelection,
} from "../input/ContainedInput/ContainedInput";
import TabsCommon from "../menu/landingPage/Tabs/TabsCommon";
import CustomColorPicker from "../Survey/SurveyTheme/components/customelements/CustomColorPicker";
import { FontWeights } from "../Survey/SurveyTheme/SurveyTheme.constants";
import TestimonialCard from "./TestimonialCard";

interface TestimonialEditModalProps {
  opened;
  onClose;
  theme: TestimonialStyleType;
}
enum BlockTabEnum {
  Background = "Background",
  DescriptionBlock = "Description Block",
  ProfileBlock = "Profile Block",
  RatingBlock = "Rating Block",
}

const TestimonialEditModal = ({
  opened,
  onClose,
  theme,
}: TestimonialEditModalProps) => {
  const [currentStyle, setCurrentstyle] = useImmer<TestimonialStyleType>(theme);
  const translations = useExtracted();
  const testimonialSample: Testimonial = {
    testimonial: {
      name: "Profile Name",
      jobTitle: "Profile Position",
      testimonial:
        "Excellent food. Menu is extensive and seasonal to a particularly high standard. Definitely fine dining. It can be expensive but worth it and they do different deals on different nights so it’s worth checking them out before you book. Highly recommended.",
      rating: 5,
    },
    id: "",
    survey: { id: "", name: "" },
    teamId: "",
    createdAt: Date.now().toString(),
  };
  const fonts = [
    {
      name: "Profile Name",
      color: currentStyle?.profileBlock.profileName.color,
      fontSize: currentStyle?.profileBlock.profileName?.fontSize,
      fontWeight: currentStyle?.profileBlock.profileName?.fontWeight,
    },
    {
      name: "Profile Position",
      color: currentStyle?.profileBlock.profilePos?.color,
      fontSize: currentStyle?.profileBlock.profilePos?.fontSize,
      fontWeight: currentStyle?.profileBlock.profilePos?.fontWeight,
    },
    {
      name: "Description",
      color: currentStyle?.descBlock.desc.color,
      fontSize: currentStyle?.descBlock.desc.fontSize,
      fontWeight: currentStyle?.descBlock.desc.fontWeight,
    },
    {
      name: "Date",
      color: currentStyle?.date.color,
      fontSize: currentStyle?.date.fontSize,
      fontWeight: currentStyle?.date.fontWeight,
    },
  ];
  function handleFontColorChange(value, type) {
    switch (type) {
      case "Profile Name":
        setCurrentstyle((draft) => {
          draft.profileBlock.profileName.color = value;
        });
        break;
      case "Profile Position":
        setCurrentstyle((draft) => {
          draft.profileBlock.profilePos.color = value;
        });
        break;
      case "Description":
        setCurrentstyle((draft) => {
          draft.descBlock.desc.color = value;
        });
        break;
      case "Date":
        setCurrentstyle((draft) => {
          draft.date.color = value;
        });
        break;
    }
  }
  function handleFontWeightChange(value, type) {
    switch (type) {
      case "Profile Name":
        setCurrentstyle((draft) => {
          draft.profileBlock.profileName.fontWeight = value;
        });
        break;
      case "Profile Position":
        setCurrentstyle((draft) => {
          draft.profileBlock.profilePos.fontWeight = value;
        });
        break;
      case "Description":
        setCurrentstyle((draft) => {
          draft.descBlock.desc.fontWeight = value;
        });
        break;
      case "Date":
        setCurrentstyle((draft) => {
          draft.date.fontWeight = value;
        });
        break;
    }
  }
  function handleFontSizeChange(value, type) {
    switch (type) {
      case "Profile Name":
        setCurrentstyle((draft) => {
          draft.profileBlock.profileName.fontSize = value;
        });
        break;
      case "Profile Position":
        setCurrentstyle((draft) => {
          draft.profileBlock.profilePos.fontSize = value;
        });
        break;
      case "Description":
        setCurrentstyle((draft) => {
          draft.descBlock.desc.fontSize = value;
        });
        break;
      case "Date":
        setCurrentstyle((draft) => {
          draft.date.fontSize = value;
        });
        break;
    }
  }
  function handleLayout(value) {
    setCurrentstyle({ ...currentStyle, layout: value });
  }
  const blocks = [
    {
      name: BlockTabEnum.Background,
      bg: currentStyle?.root.bg,
    },
    {
      name: BlockTabEnum.ProfileBlock,
      bg: currentStyle?.profileBlock.bg,
    },
    {
      name: BlockTabEnum.DescriptionBlock,
      bg: currentStyle?.descBlock.bg,
    },
    {
      name: BlockTabEnum.RatingBlock,
      bg: currentStyle?.ratingBlock.bg,
    },
  ];

  const handleBgColor = (block, value) => {
    switch (block) {
      case "Background":
        setCurrentstyle((draft) => {
          draft.root.bg = value;
          draft.profileBlock.bg = value;
          draft.descBlock.bg = value;
          draft.ratingBlock.bg = value;
        });
        break;
      case "Profile Block":
        setCurrentstyle((draft) => {
          draft.profileBlock.bg = value;
        });
        break;
      case "Description Block":
        setCurrentstyle((draft) => {
          draft.descBlock.bg = value;
        });
        break;
      case "Rating Block":
        setCurrentstyle((draft) => {
          draft.ratingBlock.bg = value;
        });
        break;
    }
  };

  const params = useParams();
  const collectionId = params.collectionId as string;
  const updateCollection = useUpdateCollection(collectionId);
  const handleUpdate = () => {
    updateCollection.mutate(
      { data: { theme: currentStyle }, collectionId },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };
  const [activeBlockTab, setActiveBlockTab] = useState<BlockTabEnum>(
    BlockTabEnum.Background,
  );
  useEffect(() => {
    setCurrentstyle(theme);
    setActiveBlockTab(BlockTabEnum.Background);
  }, [theme]);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={"1000px"}
      padding={0}
      withCloseButton={false}
      radius={"md"}
    >
      <Grid columns={10} p={"xs"}>
        <Grid.Col span={6} p={"xl"}>
          <ScrollArea h={430}>
            <Stack justify="flex-start">
              <Stack>
                <Title order={3}>{translations("Change Color")}</Title>
                <TabsCommon
                  value={activeBlockTab}
                  onChange={(value) => setActiveBlockTab(value as BlockTabEnum)}
                  tabHeading={blocks.map((c) => c.name)}
                  radius={"lg"}
                  variant="outline"
                  mr={"md"}
                >
                  {blocks.map((c) => (
                    <Tabs.Panel value={c.name} p={"xl"}>
                      <CustomColorPicker
                        value={c.bg}
                        onChange={(value) => {
                          handleBgColor(c.name, value);
                        }}
                      />
                    </Tabs.Panel>
                  ))}
                </TabsCommon>
              </Stack>
              <Stack w={470}>
                <Title order={3}>{translations("Change Font")}</Title>
                {fonts.map((f) => (
                  <Group justify="space-between" key={f?.name}>
                    <Text>{f.name}</Text>
                    <Group gap={"xs"}>
                      <ContainedColorInput
                        value={f.color}
                        w={130}
                        onChange={(value) => {
                          handleFontColorChange(value, f.name);
                        }}
                      />
                      <ContainedSelection
                        data={FontWeights}
                        style={{ maxWidth: "110px" }}
                        onChange={(value) =>
                          handleFontWeightChange(value, f.name)
                        }
                        placeholder="font weight"
                        value={f.fontWeight}
                      />
                      <ContainedNumberInput
                        min={10}
                        max={100}
                        defaultValue={18}
                        placeholder="font size"
                        style={{ maxWidth: "70px" }}
                        onChange={(value) =>
                          handleFontSizeChange(value, f.name)
                        }
                        value={f.fontSize}
                      />
                    </Group>
                  </Group>
                ))}
              </Stack>
              <Stack w={450}>
                <Title order={3}>{translations("Change Layout")}</Title>
                <Radio.Group
                  value={currentStyle?.layout}
                  onChange={(value) => handleLayout(value)}
                >
                  <Stack gap={"sm"}>
                    <Stack>
                      <Radio
                        icon={CheckIcon}
                        value={"horizontal"}
                        label={translations("Horizontal")}
                      />
                      <Carousel opts={{ slidesToScroll: 1 }} className="w-full">
                        <CarouselContent>
                          {Array.from({ length: 3 }).map((_, index) => (
                            <CarouselItem key={index} className="basis-1/4">
                              <Box
                                bg={"#E2E5ED"}
                                h={100}
                                style={{ borderRadius: "5px" }}
                              ></Box>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                      </Carousel>
                    </Stack>
                    <Stack>
                      <Radio
                        icon={CheckIcon}
                        value="vertical"
                        label={translations("Vertical")}
                      />
                      <SimpleGrid
                        cols={4}
                        spacing={"md"}
                        verticalSpacing={"sm"}
                      >
                        {Array.apply(null, { length: 8 }).map((e, index) => (
                          <Box
                            bg={"#E2E5ED"}
                            h={80}
                            w={100}
                            style={{ borderRadius: "5px" }}
                            key={index}
                          ></Box>
                        ))}
                      </SimpleGrid>
                    </Stack>
                  </Stack>
                </Radio.Group>
              </Stack>
            </Stack>
          </ScrollArea>
          <Flex gap={"sm"} mt={"xl"}>
            <RateupButtonSecondary
              title={translations("cancel")}
              onClick={() => {
                setCurrentstyle(theme);
                onClose();
              }}
            />
            <RateupButtonBlue
              title={translations("Save")}
              onClick={handleUpdate}
            />
          </Flex>
        </Grid.Col>

        <Grid.Col span={4} bg={"#E2E5ED"} p={"xl"}>
          <Stack justify="center" align="center">
            <TestimonialCard
              testimonial={testimonialSample}
              currentStyle={currentStyle}
            />
            <Stack mt="xl">
              <Checkbox
                label={translations("Remove Rating")}
                styles={{
                  label: {
                    fontWeight: "bold",
                    fontSize: "16px",
                  },
                }}
                radius={"xl"}
                checked={currentStyle?.ratingBlock.isRemoved}
                onChange={(e) => {
                  setCurrentstyle((draft) => {
                    draft.ratingBlock.isRemoved = e.currentTarget.checked;
                  });
                }}
              />
              <Checkbox
                label={translations("Remove Date")}
                radius={"xl"}
                styles={{
                  label: {
                    fontWeight: "bold",
                    fontSize: "16px",
                  },
                }}
                checked={currentStyle?.date.isRemoved}
                onChange={(e) => {
                  setCurrentstyle((draft) => {
                    draft.date.isRemoved = e.currentTarget.checked;
                  });
                }}
              />
              <Checkbox
                label={translations("Remove Profile Picture")}
                radius={"xl"}
                styles={{
                  label: {
                    fontWeight: "bold",
                    fontSize: "16px",
                  },
                }}
                checked={currentStyle?.profileBlock.profilePic.isRemoved}
                onChange={(e) => {
                  setCurrentstyle((draft) => {
                    draft.profileBlock.profilePic.isRemoved =
                      e.currentTarget.checked;
                  });
                }}
              />
            </Stack>
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
};

export default TestimonialEditModal;
