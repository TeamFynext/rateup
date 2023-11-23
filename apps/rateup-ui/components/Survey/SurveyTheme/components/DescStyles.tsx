import {
  Select,
  Stack,
  Flex,
  Text,
  ColorPicker,
  NumberInput,
  Button,
  ColorInput,
  Group,
  Box,
} from "@mantine/core";

import React, { useEffect } from "react";
import { fontList } from "../fontStyleComponents/FontList";
import { createFormContext } from "@mantine/form";
import { FontWeights } from "../fontStyleComponents/FontWeights";
import classes from "../WelcomePage.module.css";

interface FormValues {
  name: string;
  descText?: string;
  descStyles: {
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    textAlign: string;
  };
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
function DescStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  loadFont,
  saveLoading,
}) {
  const form = useForm({
    initialValues: {
      name: "description",

      descStyles: currentStyles?.descStyles,
    },
  });

  //----------font loading--------
  useEffect(() => {
    if (
      currentStyles?.descStyles?.fontFamily !== form?.values?.descStyles?.fontFamily
    ) {
      loadFont(form?.values?.descStyles?.fontFamily, () =>
        setCurrentstyles({
          ...currentStyles,
          descStyles: form?.values?.descStyles,
        }),
      );
    } else
      setCurrentstyles({
        ...currentStyles,
        descStyles: form?.values?.descStyles,
      });
  }, [form?.values]);

  useEffect(() => {
    if (!form.isDirty()) {
      form.setValues({
        name: "description",
        descStyles: currentStyles?.descStyles,
      });
    }
  }, [currentStyles]);

  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();

    saveStyles(form?.values);
  };

  return (
    <Flex>
      <Stack w={"100%"}>
        <form>
          <Box className={classes.editorBox}>
            <Box className={classes.editorSection}>
              <Select
                label="Font style"
                searchable
                nothingFoundMessage="No options"
                data={fontList}
                name="fontFamily"
                {...form.getInputProps("descStyles.fontFamily")}
              />
              <Group mt="xs">
                <Select
                  label="Font weight"
                  data={FontWeights}
                  style={{ maxWidth: "150px" }}
                  {...form.getInputProps("descStyles.fontWeight")}
                />
                <NumberInput
                  min={10}
                  max={100}
                  defaultValue={18}
                  placeholder="size"
                  label="Font Size"
                  name="fontSize"
                  style={{ maxWidth: "150px" }}
                  {...form.getInputProps("descStyles.fontSize")}
                />
              </Group>
              <Text mt={10} fw={500}>
                Choose text color
              </Text>
              <ColorPicker
                fullWidth
                format="rgba"
                {...form.getInputProps("descStyles.color")}
              />
              <ColorInput
                mt="sm"
                {...form.getInputProps("descStyles.color")}
                placeholder="Select description color"
              />
            </Box>

            <Flex justify={"center"} className={classes.saveButton}>
              <Button
                radius={48}
                size={"sm"}
                pl={40}
                pr={40}
                mt={12}
                onClick={onSubmit}
                loading={saveLoading}
              >
                {" "}
                Save
              </Button>
            </Flex>
          </Box>
        </form>
      </Stack>
    </Flex>
  );
}

export default DescStyles;
