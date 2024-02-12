import {
  Group,
  Stack,
  Title,
  Text,
  Checkbox,
  Radio,
  CheckIcon,
  Box,
  ScrollArea,
  SimpleGrid,
  Grid,
  Flex,
  Modal,
} from "@mantine/core";

import {
  ContainedColorInput,
  ContainedNumberInput,
  ContainedSelection,
} from "../input/ContainedInput/ContainedInput";

import { Carousel } from "@mantine/carousel";
import TestimonialCard from "./TestimonialCard";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";

import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import { TestimonialStyleType } from "../../types/global";
import { FontWeights } from "../Survey/SurveyTheme/SurveyTheme.constants";
import { useUpdateCollection } from "../../backend/testimonials/testimonial.query";
import { useContext } from "react";
import { defaultTestimonialStyle } from "../../utils/testimonial";

interface TestimonialEditModalProps {
  opened;
  onClose;
  setCurrentstyle: (newStyle) => void;
  currentStyle: TestimonialStyleType;
}

const TestimonialEditModal = ({
  opened,
  onClose,
  setCurrentstyle,
  currentStyle,
}: TestimonialEditModalProps) => {
  const testimonialSample = {
    testimonial: {
      name: "Profile Name",
      jobTitle: "Profile Position",
      testimonial:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, su",
      rating: 5,
    },
    createdAt: Date.now(),
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
      name: "Background",
      bg: currentStyle?.root.bg,
    },
    {
      name: "Profile Block",
      bg: currentStyle?.profileBlock.bg,
    },
    {
      name: "Description Block",
      bg: currentStyle?.descBlock.bg,
    },
    {
      name: "Rating Block",
      bg: currentStyle?.ratingBlock.bg,
    },
  ];

  const handleBgColor = (block, value) => {
    switch (block) {
      case "Background":
        setCurrentstyle((draft) => {
          draft.root.bg = value;
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

  const { selectedCollectionId } = useContext(
    SelectedTestimonialCollectionContext,
  );
  const updateCollection = useUpdateCollection(selectedCollectionId);
  const handleUpdate = () => {
    updateCollection.mutate(
      { data: { theme: currentStyle }, collectionId: selectedCollectionId },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };
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
              <Stack w={300}>
                <Title order={3}>Change Color</Title>
                {blocks.map((c) => (
                  <Group justify={"space-between"} key={c?.name}>
                    <Text>{c.name}</Text>
                    <ContainedColorInput
                      value={c.bg}
                      w={150}
                      onChange={(value) => {
                        handleBgColor(c.name, value);
                      }}
                    />
                  </Group>
                ))}
              </Stack>
              <Stack w={470}>
                <Title order={3}>Change Font</Title>
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
                <Title order={3}>Change Layout</Title>
                <Radio.Group
                  value={currentStyle?.layout}
                  onChange={(value) => handleLayout(value)}
                >
                  <Stack gap={"sm"}>
                    <Stack>
                      <Radio
                        icon={CheckIcon}
                        value={"horizontal"}
                        label="Horizontal"
                      />
                      <Carousel
                        color="#E2E5ED"
                        slideSize={"25%"}
                        slidesToScroll={1}
                        slideGap={"xs"}
                      >
                        {Array.apply(null, { length: 3 }).map((e, index) => (
                          <Carousel.Slide key={index}>
                            <Box
                              bg={"#E2E5ED"}
                              h={100}
                              style={{ borderRadius: "5px" }}
                            ></Box>
                          </Carousel.Slide>
                        ))}
                      </Carousel>
                    </Stack>
                    <Stack>
                      <Radio
                        icon={CheckIcon}
                        value="vertical"
                        label="Vertical"
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
              title="cancel"
              onClick={() => {
                setCurrentstyle(defaultTestimonialStyle);
                onClose();
              }}
            />
            <RateupButtonBlue title="Save" onClick={handleUpdate} />
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
                label={"Remove Rating"}
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
                label={"Remove Date"}
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
                label={"Remove Profile Picture"}
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
