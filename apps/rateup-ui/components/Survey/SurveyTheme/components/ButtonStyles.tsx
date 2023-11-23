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
import classes from "../WelcomePage.module.css";
import { useForm } from "@mantine/form";

function ButtonStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  loadFont,
  saveLoading,
}) {
  const form = useForm({
    initialValues: {
      name: "button",

      buttonStyles: currentStyles?.buttonStyles,
    },
  });
  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();

    saveStyles(form?.values);
  };

  //----------font loading--------
  useEffect(() => {
    if (
      currentStyles?.buttonStyles?.fontFamily !==
      form?.values?.buttonStyles?.fontFamily
    ) {
      loadFont(form?.values?.buttonStyles?.fontFamily, () =>
        setCurrentstyles({
          ...currentStyles,
          buttonStyles: form?.values?.buttonStyles,
        })
      );
    } else
      setCurrentstyles({
        ...currentStyles,
        buttonStyles: form?.values?.buttonStyles,
      });
  }, [form?.values]);

  useEffect(() => {
    if (!form.isDirty()) {
      form.setValues({
        name: "button",
        buttonStyles: currentStyles?.buttonStyles,
      });
    }
  }, [currentStyles]);
  return (
    <Flex>
      <Stack w={"100%"} justify={"center"} h="100%">
        <Box className={classes.editorBox}>
          <Box className={classes.editorSection}>
            <Group mt="xs">
              <Select
                label="Font style"
                searchable
                nothingFoundMessage="No options" //TODO VERIFY MANTINE
                data={fontList}
                name="fontFamily"
                {...form.getInputProps("buttonStyles.fontFamily")}
                style={{ maxWidth: "200px" }}
              />
              <NumberInput
                min={0}
                max={50}
                // mt={"xs"}
                defaultValue={18}
                placeholder="radius"
                label="Border Radius"
                name="borderRadius"
                {...form.getInputProps("buttonStyles.borderRadius")}
                style={{ maxWidth: "100px" }}
              />
            </Group>

            <Text mt={10} fw={500}>
              Choose background color
            </Text>
            <ColorPicker
              fullWidth
              format="rgba"
              {...form.getInputProps("buttonStyles.backgroundColor")}
            />
            <ColorInput
              mt="sm"
              {...form.getInputProps("buttonStyles.backgroundColor")}
              placeholder="Select description color"
            />
          </Box>
          <Flex justify={"center"}>
            <Button
              radius={48}
              size={"sm"}
              pl={40}
              pr={40}
              mt={15}
              onClick={onSubmit}
              loading={saveLoading}
            >
              {" "}
              Save
            </Button>
          </Flex>
        </Box>
      </Stack>
    </Flex>
  );
}

export default ButtonStyles;
