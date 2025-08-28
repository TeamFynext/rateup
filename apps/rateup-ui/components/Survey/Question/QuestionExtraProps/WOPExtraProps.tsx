"use client";

import { Box, CloseButton, SimpleGrid } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedCallback } from "@mantine/hooks";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { z } from "zod/v4";

import {
  ContainedColorInput,
  ContainedNumberInput,
  ContainedTagInput,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import { DEFAULT_WOP } from "../../TakeSurvey/TakeSurveyComponent/util";

const WOPExtraProps = ({ form }) => {
  const translations = useTranslations();
  const schema = z
    .object({
      imageSrc: z.string().optional(),
      primaryColor: z.string().min(1),
      primaryColoraround: z.string().min(1),
      contrastColor: z.string().min(1),
      size: z.number().min(1),
      segments: z
        .array(z.string())
        .min(2, { message: translations("minimum two segments needed ") }),
      segColors: z.array(z.string()),
    })
    .check((ctx) => {
      const { value: values } = ctx;
      if (
        !values.imageSrc &&
        values.segColors?.length !== values.segments?.length
      ) {
        ["segments", "segColors"].forEach((data) => {
          ctx.issues.push({
            path: [data],
            code: "custom",
            message: translations(
              "Segments and segColors should have equal number of data",
            ),
            input: "",
          });
        });
      }
      try {
        values.imageSrc && new URL(values.imageSrc);
      } catch (error) {
        ctx.issues.push({
          path: ["imageSrc"],
          code: "custom",
          message: translations("image url should be valid"),
          input: "",
        });
      }
    });
  const handleWop = useDebouncedCallback(async () => {
    const { hasErrors } = wopForm.validate();
    if (hasErrors) return;
    form.setFieldValue("wop", wopForm.values);
    wopForm.resetDirty();
  }, 500);

  const wopForm = useForm({
    initialValues: form.values.wop || DEFAULT_WOP,
    validate: zod4Resolver(schema),
    onValuesChange: handleWop,
  });

  return (
    <SimpleGrid cols={2}>
      <ContainedTagInput
        {...wopForm.getInputProps("segments")}
        label={translations("Segment of array")}
        required
        placeholder={translations("Enter the Segment and press enter")}
      />
      <ContainedTagInput
        {...wopForm.getInputProps("segColors")}
        label={"segColors"}
        placeholder={translations("Enter the segColor and press enter ")}
      />
      <ContainedTextField
        {...wopForm.getInputProps("imageSrc")}
        label={translations("Image src")}
        type="url"
        placeholder={translations("Enter the url of image")}
        rightSection={
          <CloseButton
            aria-label="Clear input"
            onClick={() => wopForm.setFieldValue("imageSrc", "")}
            style={{
              display: wopForm.getValues().imageSrc ? undefined : "none",
            }}
          />
        }
      />
      <ContainedColorInput
        {...wopForm.getInputProps("primaryColor")}
        label={translations("Primary color")}
        required
      />
      <ContainedNumberInput
        {...wopForm.getInputProps("size")}
        label={translations("Wheel Size")}
        required
        placeholder={translations("Enter the size of wheel")}
      />
      <ContainedColorInput
        {...wopForm.getInputProps("primaryColoraround")}
        label={translations("Primary color around")}
        required
      />
      <Box w={10} h={10} />
      <ContainedColorInput
        {...wopForm.getInputProps("contrastColor")}
        label={translations("Contrast color")}
        required
      />
    </SimpleGrid>
  );
};

export default WOPExtraProps;
