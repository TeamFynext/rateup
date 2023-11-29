import {
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
import classes from "../WelcomePage.module.css";
import { useForm } from "@mantine/form";

function ButtonStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
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
      JSON.stringify(form?.values?.buttonStyles) !==
      JSON.stringify(currentStyles?.buttonStyles)
    ) {
      setCurrentstyles({
        ...currentStyles,
        buttonStyles: form?.values?.buttonStyles,
      });
    }
  }, [form?.values, currentStyles]);

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

            <Text mt={10} fw={500}>
              Choose text color
            </Text>
            <ColorPicker
              fullWidth
              format="rgba"
              {...form.getInputProps("buttonStyles.color")}
            />
            <ColorInput
              mt="sm"
              {...form.getInputProps("buttonStyles.color")}
              placeholder="Select text color"
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
