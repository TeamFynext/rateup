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
import React, { useRef, useEffect, useState } from "react";
import { fontList } from "../fontStyleComponents/FontList";

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
        })
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
  return (
    <Flex>
      <Stack w={"100%"}>
        <Select
          label="Font style"
          searchable
          nothingFoundMessage="No options" //TODO VERIFY MANTINE 
          data={fontList}
         
          mt={"xs"}
          value={buttonStyle?.buttonStyles?.fontFamily}
          onChange={(value) => handleChange("fontFamily", value)}
        />

        <NumberInput
          min={0}
          max={50}
         
          // mt={"xs"}
          defaultValue={18}
          placeholder="radius"
          label="Border Radius"
          onChange={(value) => handleChange("borderRadius", value)}
        />

        <Text mt={10} fw={500}>
          Choose background color
        </Text>
        <ColorPicker
        fullWidth
          format="rgba"
          onChange={(value) => handleChange("backgroundColor", value)}
          value={buttonStyle?.buttonStyles.backgroundColor}
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
      </Stack>
    </Flex>
  );
}

export default ButtonStyles;
