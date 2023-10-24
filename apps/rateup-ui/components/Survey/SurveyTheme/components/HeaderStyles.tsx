import {
  Select,
  Stack,
  Flex,
  Text,
  ColorPicker,
  NumberInput,
  Button,
  ColorInput,
} from "@mantine/core";
import { createFormContext } from "@mantine/form";

import React, { useEffect } from "react";
import { fontList } from "../fontStyleComponents/FontList";
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
  loadFont,
  saveLoading,
}) {
  const form = useForm({
    initialValues: {
      name: "header",
      headerStyles: currentStyles.headerStyles,
    },
  });
  //----------font loading--------
  useEffect(() => {
    if (
      currentStyles.headerStyles.fontFamily !==
      form.values.headerStyles.fontFamily
    ) {
      loadFont(form.values.headerStyles.fontFamily, () =>
        setCurrentstyles({
          ...currentStyles,
          headerStyles: form.values.headerStyles,
        }),
      );
    } else
      setCurrentstyles({
        ...currentStyles,
        headerStyles: form.values.headerStyles,
      });
  }, [form.values]);

  useEffect(() => {}, [form.values]);

  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();
    saveStyles(form.values);
  };

  return (
    <Flex>
      <Stack w={"100%"} justify={"center"}>
        <form style={{ width: "100%", justifyContent: "center" }}>
          <Select
            label="Font style"
            searchable
            nothingFoundMessage="No options"
            data={fontList}
            name="fontFamily"
            {...form.getInputProps("headerStyles.fontFamily")}
          />

          <Select
            label="Font weight"
            name="fontWeight"
            {...form.getInputProps("headerStyles.fontWeight")}
            data={FontWeights}
          />
          {/* TODO : all font weights not working */}

          <NumberInput
            min={10}
            max={100}
            defaultValue={18}
            placeholder="size"
            label="Font Size"
            name="fontSize"
            {...form.getInputProps("headerStyles.fontSize")}
          />
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

          <Flex justify={"center"}>
            <Button
              radius={48}
              size={"sm"}
              pl={40}
              pr={40}
              mt={30}
              onClick={onSubmit}
              loading={saveLoading}
            >
              {" "}
              Save
            </Button>
          </Flex>
        </form>
      </Stack>
    </Flex>
  );
}

export default HeaderStyles;
