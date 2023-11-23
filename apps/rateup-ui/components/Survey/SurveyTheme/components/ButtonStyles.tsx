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
import React, { useEffect, useState } from "react";
import { fontList } from "../fontStyleComponents/FontList";
import classes from "../WelcomePage.module.css";

function ButtonStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  loadFont,
  saveLoading,
}) {
  const [buttonStyle, setButtonStyle] = useState({
    name: "button",
    buttonStyles: currentStyles.buttonStyles,
  });

  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();

    saveStyles(buttonStyle);
  };

  //----------font loading--------
  useEffect(() => {
    if (
      currentStyles.buttonStyles.fontFamily !==
      buttonStyle.buttonStyles.fontFamily
    ) {
      loadFont(buttonStyle.buttonStyles.fontFamily, () =>
        setCurrentstyles({
          ...currentStyles,
          buttonStyles: buttonStyle.buttonStyles,
        }),
      );
    } else
      setCurrentstyles({
        ...currentStyles,
        buttonStyles: buttonStyle.buttonStyles,
      });
  }, [buttonStyle]);

  const handleChange = (name, value) => {
    setButtonStyle((prevState) => ({
      ...prevState,
      buttonStyles: { ...buttonStyle.buttonStyles, [name]: value },
    }));
  };
  useEffect(() => {
    setButtonStyle({
      name: "button",
      buttonStyles: currentStyles.buttonStyles,
    });
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
                value={buttonStyle?.buttonStyles?.fontFamily}
                onChange={(value) => handleChange("fontFamily", value)}
                style={{ maxWidth: "200px" }}
              />
              <NumberInput
                min={0}
                max={50}
                // mt={"xs"}
                defaultValue={18}
                placeholder="radius"
                label="Border Radius"
                onChange={(value) => handleChange("borderRadius", value)}
                style={{ maxWidth: "100px" }}
              />
            </Group>

            <Text mt={10} fw={500}>
              Choose background color
            </Text>
            <ColorPicker
              fullWidth
              format="rgba"
              onChange={(value) => handleChange("backgroundColor", value)}
              value={buttonStyle?.buttonStyles.backgroundColor}
            />
            <ColorInput
              mt="sm"
              onChange={(value) => handleChange("backgroundColor", value)}
              value={buttonStyle?.buttonStyles.backgroundColor}
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
