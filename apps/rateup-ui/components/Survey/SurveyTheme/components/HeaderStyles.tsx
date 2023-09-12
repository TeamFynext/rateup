import {
  Box,
  Group,
  Loader,
  Select,
  Stack,
  Tabs,
  Title,
  Space,
  Paper,
  Flex,
  Text,
  TextInput,
  Card,
  ColorPicker,
  Radio,
  FileInput,
  NumberInput,
  Button,
} from "@mantine/core";
import { useSetState } from "@mantine/hooks";
import { IconUpload } from "@tabler/icons-react";
import { createFormContext } from "@mantine/form";

import React, { useRef, useEffect, useState } from "react";
import { fontList } from "../fontStyleComponents/FontList";
import { number } from "zod";
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
  saveLoading
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
        })
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
            nothingFound="No options"
            data={fontList}
            name="fontFamily"
            {...form.getInputProps("headerStyles.fontFamily")}
            
          />
          <Select
           
            label="Font weight"
            // searchable
            name="fontWeight"
            {...form.getInputProps("headerStyles.fontWeight")}
            data={FontWeights}
          />
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
          //  size="xl"
          fullWidth
            format="rgba"
            {...form.getInputProps("headerStyles.color")}
          />

          <Flex justify={"center"}>
            <Button
              bg="black"
              radius={48}
              size={"sm"}
              pl={40}
              pr={40}
              mt={20}
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
