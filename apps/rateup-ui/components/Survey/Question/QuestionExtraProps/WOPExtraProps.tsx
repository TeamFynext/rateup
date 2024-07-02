import { z } from "zod";
import { zodResolver } from "mantine-form-zod-resolver";

import { useForm } from "@mantine/form";
import { CloseButton, SimpleGrid } from "@mantine/core";

import { DEFAULT_WOP } from "../../TakeSurvey/TakeSurveyComponent/util";
import {
  ContainedColorInput,
  ContainedNumberInput,
  ContainedTagInput,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import { useDebouncedCallback } from "@mantine/hooks";

const WOPExtraProps = ({ form }) => {
  const schema = z
    .object({
      imageSrc: z.string().optional(),
      primaryColor: z.string().min(1),
      primaryColoraround: z.string().min(1),
      contrastColor: z.string().min(1),
      size: z.number().min(1),
      segments: z
        .array(z.string())
        .min(2, { message: "minimum two segments needed " }),
      segColors: z.array(z.string()),
    })
    .superRefine((values, ctx) => {
      if (
        !values.imageSrc &&
        values.segColors?.length !== values.segments?.length
      ) {
        ["segments", "segColors"].forEach((data) => {
          ctx.addIssue({
            path: [data],
            code: z.ZodIssueCode.custom,
            message: "Segments and segColors should have equal number of data",
          });
        });
      }
      try {
        values.imageSrc && new URL(values.imageSrc);
      } catch (error) {
        ctx.addIssue({
          path: ["imageSrc"],
          code: z.ZodIssueCode.custom,
          message: "image url should be valid",
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
    validate: zodResolver(schema),
    onValuesChange: handleWop,
  });

  return (
    <SimpleGrid cols={2}>
      <ContainedTextField
        {...wopForm.getInputProps("imageSrc")}
        label={"Image src"}
        type="url"
        placeholder="Enter the url of image"
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
        label={"Primary color"}
        required
      />
      <ContainedColorInput
        {...wopForm.getInputProps("primaryColoraround")}
        label={"Primary color around"}
        required
      />
      <ContainedColorInput
        {...wopForm.getInputProps("contrastColor")}
        label={"Contrast color"}
        required
      />
      <ContainedNumberInput
        {...wopForm.getInputProps("size")}
        label={"Size"}
        required
        placeholder="Enter the size of wheel"
      />
      <ContainedTagInput
        {...wopForm.getInputProps("segments")}
        label={"Segment of array"}
        required
        placeholder="Enter the Segment and press enter"
      />
      <ContainedTagInput
        {...wopForm.getInputProps("segColors")}
        label={"segColors"}
        required
        placeholder="Enter the segColor and press enter "
      />
      {/* <Box mt={28}>
        <RateupButtonPrimary
          title="update the options"
          onClick={handleWop}
          disabled={!wopForm.isDirty()}
        />
      </Box> */}
    </SimpleGrid>
  );
};

export default WOPExtraProps;
