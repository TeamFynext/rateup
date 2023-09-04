import React, { useEffect, useState } from 'react'
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
  BackgroundImage,
  Notification,
} from "@mantine/core";
import { useForm } from "@mantine/form";

function ThemePreview({currentStyles,setCurrentstyles,setSelectedType}) {
  const form = useForm({
    initialValues: {
      headerText: currentStyles?.headerText,
      descText: currentStyles?.descText,
      buttonText: currentStyles?.buttonText,
    },
  });
  const [focusedInput, setFocusedInput] = useState(null);
  // useEffect(() => {
  //   setCurrentstyles({
  //     ...currentStyles,
  //     headerText: form.values.headerText,
  //     descText: form.values.descText,
  //     buttonText: form.values.buttonText,
  //   });
  // }, [form.values]);

  useEffect(()=>{
    form.setValues({headerText:currentStyles.headerText})
      },[currentStyles])

  const handleFocus = (name?: String) => {
    setSelectedType(name);
  };

  return (
    <Flex
      w={"100%"}
      justify={"center"}
      p={30}
      style={currentStyles?.bgStyles}
      onClick={(e) => {
        e.stopPropagation(), handleFocus("background");
      }}
    >
      <BackgroundImage
        style={{ height: "100%", width: "100%", objectFit: "contain" }}
        src={
          currentStyles.bgUrl
            ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${currentStyles.bgUrl}`
             :""
        }
      >
        <form style={{ justifyContent: "center", width: "100%" }}>
          <Flex
            justify={"center"}
            align={"center"}
            w={"100%"}
            direction={"column"}
          >
            <Text>{focusedInput}</Text>
            <TextInput
              placeholder={"Welcome"}
              {...form.getInputProps("headerText")}
              mt="md"
              variant="unstyled"
              size="xxl"
              name="headerText"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.stopPropagation(), handleFocus("header");
              }}
              // w={"415px"}
              styles={{
                input: currentStyles?.headerStyles,
                // input: welocmeTheme?.headerStyles[0]
              }}
            />
            <TextInput
              {...form.getInputProps("descText")}
              placeholder={"Please fil the survey"}
              variant="unstyled"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.stopPropagation(), handleFocus("description");
              }}
              name="desc"
              styles={{
                input: currentStyles?.descStyles,
              }}
              mt="lg"
              w={"80%"}
              ta={"center"}
            />

            <Flex
              justify={"center"}
              p={10}
              mt={"10%"}
              mb={"30%"}
              style={currentStyles.buttonStyles}
              onClick={(e) => e.stopPropagation()}
            >
              <TextInput
                {...form.getInputProps("buttonText")}
                placeholder={"Welcome"}
                variant="unstyled"
                size="xs"
                // onClick={(e)=>e.stopPropagation()}
                onFocus={(e) => {
                  e.stopPropagation(), handleFocus("button");
                }}
                styles={{
                  input: {
                    color: "#fff",
                    fontSize: "18px",
                    textAlign: "center",
                    width: "150px",
                    alignSelf: "center",
                    fontWeight: 500,
                    fontFamily: currentStyles?.buttonStyles?.fontFamily
                      ? currentStyles?.buttonStyles?.fontFamily
                      : "Montserrat",
                  },
                }}
              />
            </Flex>
          </Flex>
        </form>
      </BackgroundImage>
    </Flex>
  )
}

export default ThemePreview