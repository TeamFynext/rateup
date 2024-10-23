import React from "react";

import {
  ActionIcon,
  Collapse,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { SmileyResponse } from "@/types/enums";
import {
  ContainedColorInput,
  ContainedSelection,
} from "@/components/input/ContainedInput/ContainedInput";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar";

import { getSmileyIcon } from "../../TakeSurvey/TakeSurveyComponent/SmileyRating";

export enum SmileyVariantStyle {
  Default = "Default",
  Filled = "Filled",
  FilledOnHover = "FilledOnHover",
  Custom = "Custom",
}

export enum SmileyColorType {
  Default = "Default",
  Individual = "Individual",
  Gradient = "Gradient",
}

const SmileyExtraProps = ({ form }) => {
  const features = form.values.features ? { ...form.values.features } : {};
  const [opened, { toggle }] = useDisclosure(false);

  const handleChange = (field, value) => {
    form.setFieldValue("features", {
      ...features,
      iconStyle: {
        ...features?.iconStyle,
        [field]: value,
      },
    });
  };

  const updateSmileyColor = (smiley, value) => {
    form.setFieldValue("features", {
      ...features,
      iconStyle: {
        ...features?.iconStyle,
        color: {
          ...features?.iconStyle.color,
          [smiley]: value,
        },
      },
    });
  };

  const updateSmileyEmoji = (smiley: number, value) => {
    form.setFieldValue("features", {
      ...features,
      iconStyle: {
        ...features?.iconStyle,
        emojies: {
          ...features?.iconStyle.emojies,
          [smiley]: value,
        },
      },
    });
  };

  return (
    <Stack gap={"sm"}>
      <Title size="sm">Emoji Style</Title>
      <Group justify="space-between">
        <Flex gap={"lg"}>
          <ContainedSelection
            data={Object.values(SmileyVariantStyle)}
            label={"Variant"}
            onChange={(value) => handleChange("variant", value)}
            value={features?.iconStyle?.variant}
            defaultValue={SmileyVariantStyle.Default}
          />
          <ContainedSelection
            data={Object.values(SmileyColorType)}
            label={"Color"}
            onChange={(value) => handleChange("colorType", value)}
            value={features?.iconStyle?.colorType}
            defaultValue={SmileyColorType.Default}
            disabled={
              features?.iconStyle?.variant === SmileyVariantStyle.Custom
            }
          />
        </Flex>
        <ActionIcon onClick={toggle} variant="transparent">
          {opened ? <IconChevronUp /> : <IconChevronDown />}
        </ActionIcon>
      </Group>

      <Collapse in={opened}>
        {features?.iconStyle?.variant === SmileyVariantStyle.Custom ? (
          Object.values(SmileyResponse)
            .reverse()
            .map((smiley, i) => {
              return (
                <Group>
                  <Text w={100}>{smiley}</Text> :{" "}
                  <PopoverEmojiPicker
                    showIcon={
                      features?.iconStyle?.emojies?.[i + 1] ? (
                        <Text size={"md"}>
                          {features?.iconStyle?.emojies?.[i + 1]}
                        </Text>
                      ) : null
                    }
                    onEmojiClick={(emoji) => updateSmileyEmoji(i + 1, emoji)}
                  />
                </Group>
              );
            })
        ) : features?.iconStyle?.colorType === SmileyColorType.Individual ? (
          Object.values(SmileyResponse)
            .reverse()
            .map((smiley, i) => {
              return (
                <Group my={"xs"}>
                  {getSmileyIcon(smiley)} :{" "}
                  <ContainedColorInput
                    placeholder="Choose a color"
                    onChange={(value) => updateSmileyColor(i + 1, value)}
                    value={features?.iconStyle?.color?.[i + 1]}
                  />
                </Group>
              );
            })
        ) : features?.iconStyle?.colorType === SmileyColorType.Gradient ? (
          <Group>
            <ContainedColorInput
              label={"Start Color"}
              onChange={(value) => handleChange("gradientStartColor", value)}
              value={features?.iconStyle?.gradientStartColor}
            />
            <ContainedColorInput
              label={"End Color"}
              onChange={(value) => handleChange("gradientEndColor", value)}
              value={features?.iconStyle?.gradientEndColor}
            />
          </Group>
        ) : null}
      </Collapse>
    </Stack>
  );
};

function hexToRgb(hex) {
  let bigint = parseInt(hex.slice(1), 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

export function generateGradient(startColor, endColor, steps, defaultColor) {
  if (!startColor || !endColor) {
    return [1, 2, 3, 4, 5].map((a) => defaultColor);
  }
  let startRGB = hexToRgb(startColor);
  let endRGB = hexToRgb(endColor);
  let stepFactor = 1 / (steps + 1);
  let gradientColors = [startColor];

  for (let i = 1; i <= steps; i++) {
    let r = Math.round(
      startRGB[0] + stepFactor * i * (endRGB[0] - startRGB[0]),
    );
    let g = Math.round(
      startRGB[1] + stepFactor * i * (endRGB[1] - startRGB[1]),
    );
    let b = Math.round(
      startRGB[2] + stepFactor * i * (endRGB[2] - startRGB[2]),
    );
    gradientColors.push(rgbToHex(r, g, b));
  }

  gradientColors.push(endColor);

  return gradientColors;
}

export default SmileyExtraProps;
