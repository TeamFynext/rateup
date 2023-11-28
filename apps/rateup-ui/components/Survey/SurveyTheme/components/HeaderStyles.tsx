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
import { createFormContext } from "@mantine/form";
import classes from "../WelcomePage.module.css";
import React, { useEffect } from "react";
import { FontWeights } from "../fontStyleComponents/FontWeights";

interface FormValues {
  name: string;
  id?: string;
  headerText?: string;
  headerStyles: {
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    textAlign: string;
  };
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();

function HeaderStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  saveLoading,
}) {
  const form = useForm({
    initialValues: {
      name: "header",
      headerStyles: currentStyles?.headerStyles,
    },
  });

  //----------font loading--------
  useEffect(() => {
    if (
      JSON.stringify(form?.values?.headerStyles) !==
      JSON.stringify(currentStyles?.headerStyles)
    ) {
      setCurrentstyles({
        ...currentStyles,
        headerStyles: form?.values?.headerStyles,
      });
    }
  }, [form?.values, currentStyles]);

  useEffect(() => {
    if (!form?.isDirty()) {
      form?.setValues({
        name: "header",
        headerStyles: currentStyles?.headerStyles,
      });
    }
  }, [currentStyles]);

  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();
    saveStyles(form.values);
  };

  return (
    <Flex>
      <Stack w={"100%"} justify={"center"}>
        <form style={{ width: "100%", justifyContent: "center" }}>
          <Box className={classes.editorBox}>
            <Box className={classes.editorSection}>
              <Group mt="xs">
                <Select
                  label="Font weight"
                  name="fontWeight"
                  data={FontWeights}
                  style={{ maxWidth: "150px" }}
                  {...form.getInputProps("headerStyles.fontWeight")}
                />
                {/* TODO : all font weights not working */}

                <NumberInput
                  min={10}
                  max={100}
                  defaultValue={18}
                  placeholder="size"
                  label="Font Size"
                  name="fontSize"
                  style={{ maxWidth: "150px" }}
                  {...form.getInputProps("headerStyles.fontSize")}
                />
              </Group>

              <Text mt={10} fw={500}>
                Choose text color
              </Text>
              <ColorPicker
                fullWidth
                format="rgba"
                {...form.getInputProps("headerStyles.color")}
              />
              <ColorInput
                mt="sm"
                {...form.getInputProps("headerStyles.color")}
                placeholder="Select heading color"
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

export default HeaderStyles;
