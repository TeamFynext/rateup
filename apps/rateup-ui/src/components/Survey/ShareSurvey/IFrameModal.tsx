"use client";

import {
  Box,
  Button,
  Center,
  CopyButton,
  Flex,
  Grid,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RateupButtonSecondary } from "../../Button/RateupButtons.tsx";
import {
  ContainedNumberInput,
  ContainedSelection,
} from "../../input/ContainedInput/ContainedInput.tsx";
import PaperLayout from "../../styled/Layouts/PaperLayout.tsx";

const IFrameModal = ({ close, shareUrl }) => {
  let disabled = false;
  let hasError = false;
  const form = useForm({
    initialValues: {
      width: 300,
      height: 600,
      widthUnit: "px",
      heightUnit: "px",
    },
  });

  const units = ["px", "%"];
  const errors = {
    width: "",
    height: "",
  };
  let iframe = "";
  if (form.values.widthUnit == "%" && form.values.width > 100) {
    errors.width = "Maximum 100% is allowed";
    hasError = true;
  }
  if (form.values.heightUnit == "%" && form.values.height > 100) {
    errors.height = "Maximum 100% is allowed";
    hasError = true;
  }
  if (!form.values.width || !form.values.height) {
    hasError = true;
  }
  if (hasError) {
    disabled = true;
    iframe = "";
  } else {
    errors.width = errors.height = "";
    const width = form.values.width + form.values.widthUnit;
    const height = form.values.height + form.values.heightUnit;
    iframe = `<iframe src="${shareUrl}" width="${width}" height="${height}"></iframe>`;
  }
  const { t: translations } = useTranslation();
  return (
    <Box>
      <Center>
        <Text>{translations("Create an iframe to embed survey")}</Text>
      </Center>
      <Stack gap={"md"}>
        <form>
          <Grid>
            <Grid.Col span={9}>
              <ContainedNumberInput
                label={translations("Width")}
                placeholder={translations("Enter width of iframe")}
                {...form.getInputProps("width")}
                allowNegative={false}
                allowDecimal={false}
                error={errors.width}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <ContainedSelection
                label=" "
                data={units}
                {...form.getInputProps("widthUnit")}
              />
            </Grid.Col>
            <Grid.Col span={9}>
              <ContainedNumberInput
                label={translations("Height")}
                placeholder={translations("Enter height of iframe")}
                {...form.getInputProps("height")}
                allowNegative={false}
                allowDecimal={false}
                error={errors.height}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <ContainedSelection
                label=" "
                data={units}
                {...form.getInputProps("heightUnit")}
              />
            </Grid.Col>
          </Grid>
        </form>
        <PaperLayout>
          <Stack>
            {iframe}
            <Flex justify={"flex-end"}>
              <Group gap={"sm"}>
                <RateupButtonSecondary
                  title={translations("cancel")}
                  onClick={close}
                />
                <CopyButton value={iframe}>
                  {({ copied, copy }) => (
                    <Button
                      variant={copied ? "outline" : "filled"}
                      onClick={copy}
                      rightSection={<IconCopy />}
                      radius={"lg"}
                      disabled={disabled}
                    >
                      {copied
                        ? translations("Copied")
                        : translations("Copy code")}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Flex>
          </Stack>
        </PaperLayout>
      </Stack>
    </Box>
  );
};

export default IFrameModal;
